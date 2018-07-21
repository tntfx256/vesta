import { PlatformConfig } from "../PlatformConfig";
import { execute, IExecOptions } from "../util/CmdUtil";
import { mkdir } from "../util/FsUtil";
import { findInFileAndReplace } from "../util/Util";
import { GitGen } from "./file/GitGen";

export interface IModuleConfig {
    name: string;
}

export class ModuleGen {

    constructor(public config: IModuleConfig) {
    }

    public generate() {
        const dir = this.config.name;
        const templateRepo = PlatformConfig.getRepository().module;
        const projectTemplateName = GitGen.getRepoName(templateRepo);
        const replacement = { [projectTemplateName]: this.config.name };
        const execOption: IExecOptions = { cwd: dir };
        GitGen.clone(templateRepo, dir);
        mkdir(`${dir}/src`);
        findInFileAndReplace(`${dir}/package.json`, replacement);
        // Initiating the git repo
        execute(`git init`, execOption);
        execute(`git add .`, execOption);
        execute(`git commit -m Vesta-init`, execOption);
    }
}
