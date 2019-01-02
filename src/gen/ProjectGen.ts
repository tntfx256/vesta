import { PlatformConfig } from "../PlatformConfig";
import { execute, IExecOptions } from "../util/CmdUtil";
import { mkdir } from "../util/FsUtil";
import { kebabCase } from "../util/StringUtil";
import { finalizeClonedTemplate, findInFileAndReplace } from "../util/Util";
import { ClientAppGen, IClientAppConfig } from "./ClientAppGen";
import { CommonGen } from "./CommonGen";
import { DockerGen } from "./DockerGen";
import { GitGen, IRepositoryConfig } from "./GitGen";
import { I18nConfig } from "./I18nGen";
import { IServerAppConfig, ServerAppGen } from "./ServerAppGen";

export const enum ProjectType { ClientApplication = 1, NativeClientApplication, ApiServer }

export interface IProjectConfig {
    client?: IClientAppConfig;
    createCmn?: boolean;
    i18n?: I18nConfig;
    repository?: IRepositoryConfig;
    server?: IServerAppConfig;
    type: ProjectType;
}

export interface IExtProjectConfig extends IProjectConfig {
    name?: string;
}

export class ProjectGen {
    public clientApp: ClientAppGen;
    public commonApp: CommonGen;
    public serverApp: ServerAppGen;
    private docker: DockerGen;

    constructor(public config: IExtProjectConfig) {
        this.docker = new DockerGen(config);
        //
        this.commonApp = new CommonGen(config);
        if (config.type === ProjectType.ClientApplication) {
            this.clientApp = new ClientAppGen(config);
        } else if (config.type === ProjectType.ApiServer) {
            this.serverApp = new ServerAppGen(config);
        }
    }

    public generate() {
        const isClientSideProject = this.config.type !== ProjectType.ApiServer;
        const projectName = this.config.name;
        const templateRepo = PlatformConfig.getRepository();
        const projectTemplateName = GitGen.getRepoName(isClientSideProject ? templateRepo.client : templateRepo.api);
        const repoInfo = this.config.repository;
        const replacement = { [projectTemplateName]: kebabCase(this.config.name) };
        const execOption: IExecOptions = { cwd: projectName };
        mkdir(projectName);
        // having the client or server to generate it's projects
        isClientSideProject ? this.clientApp.generate() : this.serverApp.generate();
        this.docker.compose();
        finalizeClonedTemplate(projectName, kebabCase(projectName));
        findInFileAndReplace(`${projectName}/resources/ci/deploy.sh`, replacement);
        if (!repoInfo || !repoInfo.main) {
            this.commonApp.generate();
            return;
        }
        // Initiating the git repo
        execute(`git init`, execOption);
        execute(`git add .`, execOption);
        execute(`git commit -m vesta-init`, execOption);
        this.commonApp.generate();
        execute(`git add .`, execOption);
        execute(`git commit -m vesta-common`, execOption);
        execute(`git remote add origin ${repoInfo.main}`, execOption);
        execute(`git push -u origin master`, execOption);
    }
}
