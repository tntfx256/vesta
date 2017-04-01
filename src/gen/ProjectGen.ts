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
import {FsUtil} from "../util/FsUtil";
import {CmdUtil, IExecOptions} from "../util/CmdUtil";
import {Log} from "../util/Log";

export interface IProjectGenConfig {
    name: string;
    type: string;
    pkgManager: 'npm'|'yarn';
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
    public commonApp: CommonGen;
    private docker: DockerGen;

    constructor(public config: IProjectGenConfig) {
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
        let dir = this.config.name;
        let projectRepo = this.vesta.getProjectConfig().repository;
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

    public static getGeneratorConfig(name: string, category: string): Promise<IProjectGenConfig> {
        let appConfig: IProjectGenConfig = <IProjectGenConfig>{};
        appConfig.name = _.camelCase(name);
        appConfig.pkgManager = "npm";
        let yarnVersion = CmdUtil.execSync('yarn --version', {silent: true}).stdout;
        if (yarnVersion) {
            Log.info(`Yarn version ${yarnVersion} detected. Switching package manager to yarn`);
            appConfig.pkgManager = "yarn";
        }
        appConfig.client = <IClientAppConfig>{};
        appConfig.server = <IServerAppConfig>{};
        appConfig.repository = <IRepositoryConfig>{
            baseUrl: '',
            group: category,
            common: '',
            name: appConfig.name
        };
        let questions: Array<Question> = [<Question>{
            type: 'list',
            name: 'type',
            message: 'Project Type: ',
            choices: [ProjectGen.Type.ClientSide, ProjectGen.Type.ServerSide],
            default: ProjectGen.Type.ClientSide
        }];
        return new Promise((resolve, reject) => {
            Util.prompt<{type: string}>(questions).then(answer => {
                appConfig.type = answer.type;
                if (ProjectGen.Type.ServerSide == appConfig.type) {
                    resolve(ServerAppGen.getGeneratorConfig()
                        .then((serverAppConfig: IServerAppConfig) => {
                            appConfig.server = serverAppConfig;
                            return GitGen.getGeneratorConfig(appConfig);
                        }))
                } else if (ProjectGen.Type.ClientSide == appConfig.type) {
                    resolve(ClientAppGen.getGeneratorConfig()
                        .then((clientAppConfig: IClientAppConfig) => {
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
