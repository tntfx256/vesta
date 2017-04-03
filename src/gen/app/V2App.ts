import {IProjectConfig} from "../ProjectGen";
import {GenConfig} from "../../Config";
import {GitGen} from "../file/GitGen";
import {FsUtil} from "../../util/FsUtil";

export class V2App {
    // this variable is only used for creating project
    static isActive = false;

    constructor(private config: IProjectConfig) {
    }

    public generate() {
        let dir = this.config.name;
        let repo = GenConfig.repository;
        GitGen.clone(GitGen.getRepoUrl(repo.baseUrl, repo.group, repo.template), dir, 'master');
        GitGen.cleanClonedRepo(dir);
        FsUtil.copy(`${dir}/resources/gitignore/client.setting.var.ts`, `${dir}/src/client/app/config/setting.var.ts`);
    }

    static getGeneratorConfig(config: IProjectConfig): Promise<IProjectConfig> {
        V2App.isActive = true;
        return Promise.resolve(config);
    }
}