import {Question} from "inquirer";
import * as _ from "lodash";
import {Vesta} from "./file/Vesta";
import {IServerAppConfig, ServerAppGen} from "./app/ServerAppGen";
import {CommonGen} from "./app/CommonGen";
import {Util} from "../util/Util";
import {GitGen, IRepositoryConfig} from "./file/GitGen";
import {ClientAppGen, IClientAppConfig} from "./app/client/ClientAppGen";
import {ClientAppGenFactory} from "./app/ClientAppGenFactory";
import {DockerGen} from "./code/DockerGen";
import {I18nGenConfig} from "./code/I18nGen";
import {FsUtil} from "../util/FsUtil";
import {CmdUtil, IExecOptions} from "../util/CmdUtil";
import {Log} from "../util/Log";
import {GenConfig} from "../Config";
import {V2App} from "./app/V2App";

export interface IProjectConfig {
    name: string;
    type: string;
    pkgManager: 'npm' | 'yarn';
    server: IServerAppConfig;
    client: IClientAppConfig;
    repository: IRepositoryConfig;
    i18n: I18nGenConfig;
}

export class ProjectGen {

    static Type = {ServerSide: 'serverSide', ClientSide: 'clientSide'};

    private static instance: ProjectGen;
    public vesta: Vesta;
    public serverApp: ServerAppGen;
    public clientApp: ClientAppGen;
    public v2App: V2App;
    public commonApp: CommonGen;
    private docker: DockerGen;

    constructor(public config: IProjectConfig) {
        //
        this.vesta = Vesta.getInstance(config);
        this.docker = new DockerGen(config);
        //
        if (this.vesta.isV1) {
            this.commonApp = new CommonGen(config);
            if (config.type == ProjectGen.Type.ClientSide) {
                this.clientApp = ClientAppGenFactory.create(config);
            } else if (config.type == ProjectGen.Type.ServerSide) {
                this.serverApp = new ServerAppGen(config);
            }
        } else {
            this.v2App = new V2App(config);
        }
        ProjectGen.instance = this;
    }

    public generate() {
        if (this.vesta.isV1) return this.v1Generate();
        this.v2Generate();
    }

    private v1Generate() {
        let dir = this.config.name;
        let projectRepo = GenConfig.repository;
        let projectTemplateName = projectRepo.express;
        let repoInfo = this.config.repository;
        let replacement = {};
        let isClientSideProject = this.config.type == ProjectGen.Type.ClientSide;
        let execOption: IExecOptions = {cwd: dir};
        if (isClientSideProject) {
            projectTemplateName = this.config.client.framework == ClientAppGen.Framework.Ionic ? projectRepo.ionic : projectRepo.material;
        }
        FsUtil.mkdir(dir);
        // having the client or server to generate it's projects
        isClientSideProject ? this.clientApp.generate() : this.serverApp.generate();
        this.docker.compose();
        CmdUtil.execSync(`git init`, execOption);
        this.vesta.generate();
        replacement[projectTemplateName] = this.config.name;
        Util.findInFileAndReplace(`${dir}/package.json`, replacement);
        Util.findInFileAndReplace(`${dir}/resources/ci/deploy.sh`, replacement);
        // Initiating the git repo
        CmdUtil.execSync(`git add .`, execOption);
        CmdUtil.execSync(`git commit -m Vesta-init`, execOption);
        this.commonApp.generate();
        if (!repoInfo.baseUrl) return;
        CmdUtil.execSync(`git add .`, execOption);
        CmdUtil.execSync(`git commit -m Vesta-common`, execOption);
        CmdUtil.execSync(`git remote add origin ${GitGen.getRepoUrl(repoInfo.baseUrl, repoInfo.group, repoInfo.name)}`, execOption);
        CmdUtil.execSync(`git push -u origin master`, execOption);
    }

    private v2Generate() {
        let dir = this.config.name;
        let sourceRepoConfig = GenConfig.repository;
        let sourceRepoName = sourceRepoConfig.template;
        let projectRepoConfig = this.config.repository;
        let replacement = {};
        let execOption: IExecOptions = {cwd: dir};
        FsUtil.mkdir(dir);
        // having the client or server to generate it's projects
        this.v2App.generate();
        this.docker.compose();
        CmdUtil.execSync(`git init`, execOption);
        this.vesta.generate();
        replacement[sourceRepoName] = this.config.name;
        Util.findInFileAndReplace(`${dir}/package.json`, replacement);
        Util.findInFileAndReplace(`${dir}/resources/ci/deploy.sh`, replacement);
        // Initiating the git repo
        CmdUtil.execSync(`git add .`, execOption);
        CmdUtil.execSync(`git commit -m Vesta-init`, execOption);
        if (!projectRepoConfig.baseUrl) return;
        CmdUtil.execSync(`git remote add origin ${GitGen.getRepoUrl(projectRepoConfig.baseUrl, projectRepoConfig.group, projectRepoConfig.name)}`, execOption);
        CmdUtil.execSync(`git push -u origin master`, execOption);
    }

    private static getPlatform(): Promise<number> {
        let question: Question = <Question>{
            type: 'list',
            name: 'version',
            message: 'Platform version: ',
            choices: ['V1', 'V2'],
            default: 'V2'
        };
        return Util.prompt<{ version: string }>(question)
            .then(answer => {
                return answer.version == 'V1' ? 1 : 2;
            });
    }

    public static getGeneratorConfig(name: string, category: string): Promise<IProjectConfig> {
        let appConfig: IProjectConfig = <IProjectConfig>{};
        appConfig.name = _.camelCase(name);
        appConfig.pkgManager = "npm";
        let yarnVersion = CmdUtil.execSync('yarn --version', {silent: true}).stdout;
        if (yarnVersion) {
            Log.info(`Yarn version ${yarnVersion} detected. Switching package manager to yarn`);
            appConfig.pkgManager = "yarn";
        }
        return ProjectGen.getPlatform()
            .then(platformVersion => {
                appConfig.client = <IClientAppConfig>{};
                appConfig.server = <IServerAppConfig>{};
                appConfig.repository = <IRepositoryConfig>{
                    baseUrl: '',
                    group: category,
                    name: appConfig.name
                };
                if (platformVersion === 2) {
                    return V2App.getGeneratorConfig(appConfig);
                }
                let questions: Array<Question> = [<Question>{
                    type: 'list',
                    name: 'type',
                    message: 'Project Type: ',
                    choices: [ProjectGen.Type.ClientSide, ProjectGen.Type.ServerSide],
                    default: ProjectGen.Type.ClientSide
                }];
                return Util.prompt<{ type: string }>(questions)
                    .then(answer => {
                        appConfig.type = answer.type;
                        if (ProjectGen.Type.ServerSide == appConfig.type) {
                            return ServerAppGen.getGeneratorConfig()
                                .then((serverAppConfig: IServerAppConfig) => {
                                    appConfig.server = serverAppConfig;
                                    return appConfig;
                                })
                        }
                        if (ProjectGen.Type.ClientSide == appConfig.type) {
                            return ClientAppGen.getGeneratorConfig()
                                .then((clientAppConfig: IClientAppConfig) => {
                                    appConfig.client = clientAppConfig;
                                    return appConfig;
                                })
                        }
                    });
            })
    }

    public static getInstance() {
        return ProjectGen.getInstance();
    }
}
