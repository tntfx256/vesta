import {Question} from "inquirer";
import {Util} from "../util/Util";
import {GitGen} from "./file/GitGen";
import {CmdUtil, IExecOptions} from "../util/CmdUtil";
import {PlatformConfig} from "../PlatformConfig";
import {FsUtil} from "../util/FsUtil";

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
        FsUtil.mkdir(`${dir}/src`);
        Util.findInFileAndReplace(`${dir}/package.json`, replacement);
        // Initiating the git repo
        CmdUtil.execSync(`git init`, execOption);
        CmdUtil.execSync(`git add .`, execOption);
        CmdUtil.execSync(`git commit -m Vesta-init`, execOption);
    }
}
