import {GitGen} from "./file/GitGen";
import {PlatformConfig} from "../PlatformConfig";
import {execute, IExecOptions} from "../util/CmdUtil";
import {mkdir} from "../util/FsUtil";
import {findInFileAndReplace} from "../util/Util";

export interface IModuleConfig {
    name: string;
}

export class ModuleGen {

    constructor(public config: IModuleConfig) {
    }

    public generate() {
        let dir = this.config.name;
        let templateRepo = PlatformConfig.getRepository().module;
        let projectTemplateName = GitGen.getRepoName(templateRepo);
        let replacement = {[projectTemplateName]: this.config.name};
        let execOption: IExecOptions = {cwd: dir};
        GitGen.clone(templateRepo, dir);
        mkdir(`${dir}/src`);
        findInFileAndReplace(`${dir}/package.json`, replacement);
        // Initiating the git repo
        execute(`git init`, execOption);
        execute(`git add .`, execOption);
        execute(`git commit -m Vesta-init`, execOption);
    }
}
