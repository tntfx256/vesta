import { join } from "path";
import { PlatformConfig } from "../PlatformConfig";
import { execute, IExecOptions } from "../util/CmdUtil";
import { mkdir, remove } from "../util/FsUtil";
import { Log } from "../util/Log";
import { finalizeClonedTemplate } from "../util/Util";
import { GitGen } from "./GitGen";
import { IExtProjectConfig } from "./ProjectGen";
import { Vesta } from "./Vesta";

export class CommonGen {
    private vesta: Vesta;

    constructor(private config: IExtProjectConfig) {
    }

    /**
     * if ( init git project )
     *      if ( first time )   => create dir => clone template => commit => push => add submodule
     *      else                => add .submodule
     * else                     => clone template
     *
     * SubModule must be added after the init & commit of main project,
     * so it's function addSubModule is called from ProjectGen
     */
    public generate() {
        if (this.config.repository && this.config.repository.common) {
            if (!GitGen.commonProjectExists) {
                this.createCommonProject();
            }
            this.addSubModule();
        } else {
            this.initWithoutSubModule();
        }
    }

    private addSubModule() {
        if (!this.config.repository.common) { return; }
        const cwd = this.config.name;
        const repo = this.config.repository;
        const cmnDir = Vesta.directories.cmn;
        try {
            execute(`git rm ${cmnDir}`, { cwd });
        } catch (e) {
            Log.error(e.message);
        }
        remove(`${cwd}/${cmnDir}`);
        try {
            execute(`git submodule add ${repo.common} ${cmnDir}`, { cwd });
        } catch (e) {
            Log.error(e.message);
        }
    }

    private createCommonProject() {
        const repository = this.config.repository;
        const cmnDir = `${this.config.name}/${Vesta.directories.cmn}`;
        try {
            GitGen.clone(PlatformConfig.getRepository().cmn, cmnDir);
        } catch (e) {
            Log.error(e.message);
        }
        finalizeClonedTemplate(cmnDir);
        const execOptions: IExecOptions = { cwd: cmnDir };
        execute(`git init`, execOptions);
        execute(`git add .`, execOptions);
        execute(`git commit -m vesta-cmn-init`, execOptions);
        execute(`git remote add origin ${repository.common}`, execOptions);
        execute(`git push -u origin master`, execOptions);
    }

    private initWithoutSubModule() {
        const dir = this.config.name;
        const destDir = join(dir, Vesta.directories.cmn);
        mkdir(destDir);
        try {
            GitGen.clone(PlatformConfig.getRepository().cmn, destDir);
        } catch (e) {
            Log.error(e.message);
        }
        finalizeClonedTemplate(destDir);
    }
}
