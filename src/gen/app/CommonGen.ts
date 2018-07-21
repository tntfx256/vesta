import { join as pathJoin } from "path";
import { PlatformConfig } from "../../PlatformConfig";
import { execute, IExecOptions } from "../../util/CmdUtil";
import { mkdir, remove } from "../../util/FsUtil";
import { finalizeClonedTemplate } from "../../util/Util";
import { GitGen } from "../file/GitGen";
import { Vesta } from "../file/Vesta";
import { IExtProjectConfig } from "../ProjectGen";

export class CommonGen {
    private vesta: Vesta;

    constructor(private config: IExtProjectConfig) {
        this.vesta = Vesta.getInstance();
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
        const cmnDir = this.vesta.getCmnDirectory(true);
        remove(`${cwd}/${cmnDir}`);
        return execute(`git submodule add ${repo.common} ${cmnDir}`, { cwd });
    }

    /**
     * git init
     * git commit --message=""
     * git remote add origin http://gitServer.ir/group/name.git
     * git push origin master
     */
    private createCommonProject() {
        const repository = this.config.repository;
        const cmnDir = GitGen.getRepoName(repository.common);
        const execOptions: IExecOptions = { cwd: GitGen.getRepoName(this.config.repository.common) };
        GitGen.clone(PlatformConfig.getRepository().cmn, cmnDir);
        finalizeClonedTemplate(cmnDir);
        execute(`git init`, execOptions);
        execute(`git add .`, execOptions);
        execute(`git commit -m Vesta-init`, execOptions);
        execute(`git remote add origin ${repository.common}`, execOptions);
        execute(`git push -u origin master`, execOptions);
    }

    private initWithoutSubModule() {
        const dir = this.config.name;
        const destDir = pathJoin(dir, this.vesta.getCmnDirectory(true));
        mkdir(destDir);
        GitGen.clone(PlatformConfig.getRepository().cmn, destDir);
        finalizeClonedTemplate(destDir);
    }
}
