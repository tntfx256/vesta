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
import {Config} from "../Config";
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
    public git:GitGen;
    public serverApp:ServerAppGen;
    public clientApp:ClientAppGen;
    public commonApp:CommonGen;
    private docker:DockerGen;

    constructor(public config:IProjectGenConfig) {
        //
        this.vesta = Vesta.getInstance(config);
        this.git = new GitGen(config);
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

    private initApp():Promise<any> {
        if (this.clientApp) {
            return this.clientApp.generate();
        } else if (this.serverApp) {
            return this.serverApp.generate();
        }
        return Promise.resolve();
    }

    public generate() {
        var dir = this.config.name,
            projectTemplateName,
            replacement = {};
        Util.fs.mkdir(dir);
        //
        this.initApp()
            .then(()=>this.docker.compose())
            .then(()=> Util.exec(`git init`, dir))
            .then(()=> this.commonApp.generate())
            .then(()=> {
                // Removing cloned directory
                Util.fs.remove(`${dir}/fw`);
                this.vesta.generate();
                if (this.config.type == ProjectGen.Type.ClientSide) {
                    projectTemplateName = this.config.client.framework == ClientAppGen.Framework.Ionic ? 'ionicCodeTemplate' : 'materialCodeTemplate';
                } else {
                    projectTemplateName = 'expressCodeTemplate';
                }
                replacement[projectTemplateName] = this.config.name;
                Util.findInFileAndReplace(`${dir}/package.json`, replacement);
                if (this.config.type == ProjectGen.Type.ClientSide) {
                    Util.findInFileAndReplace(`${dir}/bower.json`, replacement);
                }
                // Util.findInFileAndReplace(`${dir}/vesta.json`, replacement);
                // Initiating the git repo -> create dev branch
                return Util.exec(`git add .`, dir)
                    .then(()=>Util.exec(`git commit -m Vesta`, dir))
                    .then(()=>this.commonApp.addSubModule())
                    .then(()=> {
                        return GitGen.getRepoUrl(Config.repository.baseRepoUrl, true)
                            .then(url=>Util.exec(`git remote add origin ${url}:${this.config.repository.group}/${this.config.name}.git`, dir))
                            .then(()=>Util.exec(`git push -u origin master`, dir))
                    })
                    .then(()=>Util.exec(`git add .`, dir))
                    .then(()=>Util.exec(`git commit -m subModule`, dir))
                    .then(()=>Util.exec(`git checkout -b dev`, dir))
                    .then(()=>Util.exec(`git push -u origin dev`, dir));
            })
            .catch(reason=> {
                Util.log.error(reason);
            });
    }

    public static getGeneratorConfig(name:string, category:string):Promise<IProjectGenConfig> {
        var appConfig:IProjectGenConfig = <IProjectGenConfig>{};
        appConfig.name = _.camelCase(name);
        appConfig.client = <IClientAppConfig>{};
        appConfig.server = <IServerAppConfig>{};
        appConfig.repository = <IRepositoryConfig>{
            baseRepoUrl: Config.repository.baseRepoUrl,
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
