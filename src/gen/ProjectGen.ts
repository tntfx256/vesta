import * as inquirer from "inquirer";
import {Question} from "inquirer";
import * as _ from "lodash";
import {Vesta} from "./file/Vesta";
import {ServerAppGen, IServerAppConfig} from "./app/ServerAppGen";
import {CommonGen} from "./app/CommonGen";
import {Util} from "../util/Util";
import {GitGen, IRepositoryConfig} from "./file/GitGen";
import {IClientAppConfig, ClientAppGen} from "./app/client/ClientAppGen";
import {ClientAppGenFactory} from "./app/ClientAppGenFactory";
import {DockerGen} from "./code/DockerGen";
import {I18nGenConfig} from "./code/I18nGen";

export interface IProjectGenConfig {
    name:string;
    type:string;
    endpoint:string;
    server:IServerAppConfig;
    client:IClientAppConfig;
    repository:IRepositoryConfig;
    i18n:I18nGenConfig;
}

export class ProjectGen {

    static Type = {ServerSide: 'serverSide', ClientSide: 'clientSide'};

    private static instance:ProjectGen;
    public vesta:Vesta;
    public serverApp:ServerAppGen;
    public clientApp:ClientAppGen;
    public commonApp:CommonGen;
    private docker:DockerGen;

    constructor(public config:IProjectGenConfig) {
        //
        this.vesta = Vesta.getInstance(config);
        this.docker = new DockerGen(config);
        //
        this.commonApp = new CommonGen(config);
        if (config.type == ProjectGen.Type.ClientSide) {
            this.clientApp = ClientAppGenFactory.create(config);
        } else if (config.type == ProjectGen.Type.ServerSide) {
            this.serverApp = new ServerAppGen(config);
        }
        ProjectGen.instance = this;
    }

    public generate() {
        var dir = this.config.name;
        var projectRepo = this.vesta.getProjectConfig().repository;
        var projectTemplateName = projectRepo.express;
        var repoInfo = this.config.repository;
        var replacement = {};
        var isClientSideProject = this.config.type == ProjectGen.Type.ClientSide;
        if (isClientSideProject) {
            projectTemplateName = this.config.client.framework == ClientAppGen.Framework.Ionic ? projectRepo.ionic : projectRepo.material;
        }
        Util.fs.mkdir(dir);
        //
        isClientSideProject ? this.clientApp.generate() : this.serverApp.generate();
        this.docker.compose();
        Util.execSync(`git init`, dir);
        this.vesta.generate();
        replacement[projectTemplateName] = this.config.name;
        Util.findInFileAndReplace(`${dir}/package.json`, replacement);
        if (this.config.type == ProjectGen.Type.ClientSide) {
            Util.findInFileAndReplace(`${dir}/bower.json`, replacement);
        }
        // Initiating the git repo -> create dev branch
        Util.execSync(`git add .`, dir);
        Util.execSync(`git commit -m Vesta-init`, dir);
        this.commonApp.generate();
        if (!repoInfo.baseUrl) return;
        Util.execSync(`git add .`, dir);
        Util.execSync(`git commit -m Vesta-common`, dir);
        Util.execSync(`git remote add origin ${GitGen.getRepoUrl(repoInfo.baseUrl, repoInfo.group, repoInfo.name)}`, dir);
        Util.execSync(`git push -u origin master`, dir);
        Util.execSync(`git checkout -b dev`, dir);
        Util.execSync(`git push -u origin dev`, dir);
    }

    public static getGeneratorConfig(name:string, category:string):Promise<IProjectGenConfig> {
        var appConfig:IProjectGenConfig = <IProjectGenConfig>{};
        appConfig.name = _.camelCase(name);
        appConfig.client = <IClientAppConfig>{};
        appConfig.server = <IServerAppConfig>{};
        appConfig.repository = <IRepositoryConfig>{
            baseUrl: '',
            group: category,
            common: '',
            name: appConfig.name
        };
        var questions:Array<Question> = [<Question>{
            type: 'list',
            name: 'type',
            message: 'Project Type: ',
            choices: [ProjectGen.Type.ClientSide, ProjectGen.Type.ServerSide],
            default: ProjectGen.Type.ClientSide
        }, <Question>{
            type: 'input',
            name: 'endpoint',
            message: 'API Endpoint: ',
            default: 'http://localhost:3000'
        }];
        return new Promise((resolve, reject)=> {
            inquirer.prompt(questions, answer => {
                appConfig.type = answer['type'];
                appConfig.endpoint = answer['endpoint'];
                if (ProjectGen.Type.ServerSide == appConfig.type) {
                    resolve(ServerAppGen.getGeneratorConfig()
                        .then((serverAppConfig:IServerAppConfig)=> {
                            appConfig.server = serverAppConfig;
                            return GitGen.getGeneratorConfig(appConfig);
                        }))
                } else if (ProjectGen.Type.ClientSide == appConfig.type) {
                    resolve(ClientAppGen.getGeneratorConfig()
                        .then((clientAppConfig:IClientAppConfig)=> {
                            appConfig.client = clientAppConfig;
                            return GitGen.getGeneratorConfig(appConfig);
                        }))
                }
            });
        })
    }

    public static getInstance() {
        return ProjectGen.getInstance();
    }
}