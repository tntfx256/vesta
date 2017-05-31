import {Question} from "inquirer";
import * as _ from "lodash";
import {Vesta} from "./file/Vesta";
import {IServerAppConfig, ServerAppGen} from "./app/ServerAppGen";
import {CommonGen} from "./app/CommonGen";
import {Util} from "../util/Util";
import {GitGen, IRepositoryConfig} from "./file/GitGen";
import {ClientAppGen, IClientAppConfig} from "./app/ClientAppGen";
import {DockerGen} from "./code/DockerGen";
import {I18nGenConfig} from "./code/I18nGen";
import {FsUtil} from "../util/FsUtil";
import {CmdUtil, IExecOptions} from "../util/CmdUtil";
import {PlatformConfig} from "../PlatformConfig";

export enum ProjectType{ClientApplication = 1, ControlPanel, ApiServer}

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

    private static instance: ProjectGen;
    public vesta: Vesta;
    public serverApp: ServerAppGen;
    public clientApp: ClientAppGen;
    public commonApp: CommonGen;
    private docker: DockerGen;

    constructor(public config: IProjectConfig) {
        //
        this.vesta = Vesta.getInstance(config);
        this.docker = new DockerGen(config);
        //
        this.commonApp = new CommonGen(config);
        if (config.type == ProjectType.ClientApplication) {
            this.clientApp = new ClientAppGen(config);
        } else if (config.type == ProjectType.ApiServer) {
            this.serverApp = new ServerAppGen(config);
        }
        ProjectGen.instance = this;
    }

    public generate() {
        let isClientSideProject = this.config.type == ProjectType.ClientApplication;
        let dir = this.config.name;
        let templateRepo = PlatformConfig.getRepository();
        let projectTemplateName = GitGen.getRepoName(templateRepo.api);
        if (isClientSideProject) projectTemplateName = GitGen.getRepoName(this.vesta.isControlPanel ? templateRepo.cpanel : templateRepo.client);
        let repoInfo = this.config.repository;
        let replacement = {[projectTemplateName]: this.config.name};
        let execOption: IExecOptions = {cwd: dir};
        FsUtil.mkdir(dir);
        // having the client or server to generate it's projects
        isClientSideProject ? this.clientApp.generate() : this.serverApp.generate();
        this.docker.compose();
        CmdUtil.execSync(`git init`, execOption);
        this.vesta.generate();
        Util.findInFileAndReplace(`${dir}/package.json`, replacement);
        Util.findInFileAndReplace(`${dir}/resources/ci/deploy.sh`, replacement);
        // Initiating the git repo
        CmdUtil.execSync(`git add .`, execOption);
        CmdUtil.execSync(`git commit -m Vesta-init`, execOption);
        this.commonApp.generate();
        if (!repoInfo.main) return;
        CmdUtil.execSync(`git add .`, execOption);
        CmdUtil.execSync(`git commit -m Vesta-common`, execOption);
        CmdUtil.execSync(`git remote add origin ${repoInfo.main}`, execOption);
        CmdUtil.execSync(`git push -u origin master`, execOption);
    }

    public static getGeneratorConfig(name: string): Promise<IProjectConfig> {
        let appConfig: IProjectConfig = <IProjectConfig>{};
        appConfig.name = _.camelCase(name);
        appConfig.pkgManager = "npm";
        appConfig.repository = <IRepositoryConfig>{};
        const projectTypes = ['Client Application', 'Control Panel', 'Api Server'];
        let questions: Array<Question> = [<Question>{
            type: 'list',
            name: 'type',
            message: 'Project Type: ',
            choices: projectTypes
        }];
        return Util.prompt<any>(questions)
            .then(answer => {
                appConfig.type = ProjectType.ClientApplication;
                if (answer.type == projectTypes[1]) appConfig.type = ProjectType.ControlPanel;
                else if (answer.type == projectTypes[2]) appConfig.type = ProjectType.ApiServer;

                return appConfig.type == ProjectType.ApiServer ?
                    ServerAppGen.getGeneratorConfig().then((serverAppConfig: IServerAppConfig) => {
                        appConfig.server = serverAppConfig;
                        return appConfig;
                    }) :
                    ClientAppGen.getGeneratorConfig().then((clientAppConfig: IClientAppConfig) => {
                        appConfig.client = clientAppConfig;
                        return appConfig;
                    })
            })

    }
}
