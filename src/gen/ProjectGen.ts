import {Vesta} from "./file/Vesta";
import {IServerAppConfig, ServerAppGen} from "./app/ServerAppGen";
import {CommonGen} from "./app/CommonGen";
import {GitGen, IRepositoryConfig} from "./file/GitGen";
import {ClientAppGen, IClientAppConfig} from "./app/ClientAppGen";
import {DockerGen} from "./code/DockerGen";
import {I18nGenConfig} from "./code/I18nGen";
import {PlatformConfig} from "../PlatformConfig";
import {execute, IExecOptions} from "../util/CmdUtil";
import {mkdir} from "../util/FsUtil";
import {finalizeClonedTemplate, findInFileAndReplace} from "../util/Util";

export const enum ProjectType {ClientApplication = 1, ControlPanel, ApiServer}

export interface IProjectConfig {
    name: string;
    type: ProjectType;
    server?: IServerAppConfig;
    client?: IClientAppConfig;
    repository?: IRepositoryConfig;
    i18n?: I18nGenConfig;
}

export class ProjectGen {

    public vesta: Vesta;
    public serverApp: ServerAppGen;
    public clientApp: ClientAppGen;
    public commonApp: CommonGen;
    private docker: DockerGen;

    constructor(public config: IProjectConfig) {
        this.vesta = Vesta.getInstance(config);
        this.docker = new DockerGen(config);
        //
        this.commonApp = new CommonGen(config);
        if (config.type == ProjectType.ClientApplication) {
            this.clientApp = new ClientAppGen(config);
        } else if (config.type == ProjectType.ApiServer) {
            this.serverApp = new ServerAppGen(config);
        } else if (config.type == ProjectType.ControlPanel) {
            this.clientApp = new ClientAppGen(config);
        }
    }

    public generate() {
        let isClientSideProject = this.config.type != ProjectType.ApiServer;
        let dir = this.config.name;
        let templateRepo = PlatformConfig.getRepository();
        let projectTemplateName = GitGen.getRepoName(isClientSideProject ? (this.vesta.isControlPanel ? templateRepo.cpanel : templateRepo.client) : templateRepo.api);
        let repoInfo = this.config.repository;
        let replacement = {[projectTemplateName]: this.config.name};
        let execOption: IExecOptions = {cwd: dir};
        mkdir(dir);
        // having the client or server to generate it's projects
        isClientSideProject ? this.clientApp.generate() : this.serverApp.generate();
        this.docker.compose();
        this.vesta.generate();
        finalizeClonedTemplate(dir, this.config.name);
        findInFileAndReplace(`${dir}/resources/ci/deploy.sh`, replacement);
        if (!repoInfo || !repoInfo.main) {
            this.commonApp.generate();
            return;
        }
        // Initiating the git repo
        execute(`git init`, execOption);
        execute(`git add .`, execOption);
        execute(`git commit -m Vesta-init`, execOption);
        this.commonApp.generate();
        execute(`git add .`, execOption);
        execute(`git commit -m Vesta-common`, execOption);
        execute(`git remote add origin ${repoInfo.main}`, execOption);
        execute(`git push -u origin master`, execOption);
    }
}
