import { PlatformConfig } from "../PlatformConfig";
import { execute, IExecOptions } from "../util/CmdUtil";
import { mkdir } from "../util/FsUtil";
import { kebabCase } from "../util/StringUtil";
import { finalizeClonedTemplate, findInFileAndReplace } from "../util/Util";
import { ClientAppGen, IClientAppConfig } from "./app/ClientAppGen";
import { CommonGen } from "./app/CommonGen";
import { IServerAppConfig, ServerAppGen } from "./app/ServerAppGen";
import { DockerGen } from "./code/DockerGen";
import { I18nConfig } from "./code/I18nGen";
import { GitGen, IRepositoryConfig } from "./file/GitGen";
import { Vesta } from "./file/Vesta";

export const enum ProjectType { ClientApplication = 1, AdminPanel, ApiServer }

export interface IProjectConfig {
    client?: IClientAppConfig;
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
    public vesta: Vesta;
    private docker: DockerGen;

    constructor(public config: IExtProjectConfig) {
        this.vesta = Vesta.getInstance(config);
        this.docker = new DockerGen(config);
        //
        this.commonApp = new CommonGen(config);
        if (config.type == ProjectType.ClientApplication) {
            this.clientApp = new ClientAppGen(config);
        } else if (config.type == ProjectType.ApiServer) {
            this.serverApp = new ServerAppGen(config);
        } else if (config.type == ProjectType.AdminPanel) {
            this.clientApp = new ClientAppGen(config);
        }
    }

    public generate() {
        const isClientSideProject = this.config.type != ProjectType.ApiServer;
        const dir = this.config.name;
        const templateRepo = PlatformConfig.getRepository();
        const projectTemplateName = GitGen.getRepoName(isClientSideProject ? (this.vesta.isAdminPanel ? templateRepo.admin : templateRepo.client) : templateRepo.api);
        const repoInfo = this.config.repository;
        const replacement = { [projectTemplateName]: kebabCase(this.config.name) };
        const execOption: IExecOptions = { cwd: dir };
        mkdir(dir);
        // having the client or server to generate it's projects
        isClientSideProject ? this.clientApp.generate() : this.serverApp.generate();
        this.docker.compose();
        this.vesta.generate(dir);
        finalizeClonedTemplate(dir, kebabCase(this.config.name));
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
