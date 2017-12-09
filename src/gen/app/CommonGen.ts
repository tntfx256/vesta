import {join as pathJoin} from "path";
import {IExtProjectConfig} from "../ProjectGen";
import {GitGen} from "../file/GitGen";
import {Vesta} from "../file/Vesta";
import {PlatformConfig} from "../../PlatformConfig";
import {execute, IExecOptions} from "../../util/CmdUtil";
import {finalizeClonedTemplate} from "../../util/Util";
import {mkdir, remove} from "../../util/FsUtil";

export class CommonGen {
    private vesta: Vesta;

    constructor(private config: IExtProjectConfig) {
        this.vesta = Vesta.getInstance();
    }

    private addSubModule() {
        if (!this.config.repository.common) return;
        let cwd = this.config.name;
        let repo = this.config.repository;
        remove(`${cwd}/${this.vesta.cmnDirectory}`);
        return execute(`git submodule add ${repo.common} ${this.vesta.cmnDirectory}`, {cwd});
    }

    /**
     * git init
     * git commit --message=""
     * git remote add origin http://gitServer.ir/group/name.git
     * git push origin master
     */
    private createCommonProject() {
        let repository = this.config.repository,
            cmnDir = GitGen.getRepoName(repository.common),
            execOptions: IExecOptions = {cwd: GitGen.getRepoName(this.config.repository.common)};
        GitGen.clone(PlatformConfig.getRepository().cmn, cmnDir);
        finalizeClonedTemplate(cmnDir);
        execute(`git init`, execOptions);
        execute(`git add .`, execOptions);
        execute(`git commit -m Vesta-init`, execOptions);
        execute(`git remote add origin ${repository.common}`, execOptions);
        execute(`git push -u origin master`, execOptions);
    }

    private initWithoutSubModule() {
        let dir = this.config.name,
            destDir = pathJoin(dir, this.vesta.cmnDirectory);
        mkdir(destDir);
        GitGen.clone(PlatformConfig.getRepository().cmn, destDir);
        finalizeClonedTemplate(destDir);
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
                this.createCommonProject()
            }
            this.addSubModule();
        } else {
            this.initWithoutSubModule();
        }
    }
}
