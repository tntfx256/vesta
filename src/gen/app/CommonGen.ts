import * as path from "path";
import {IProjectConfig} from "../ProjectGen";
import {GitGen} from "../file/GitGen";
import {Vesta} from "../file/Vesta";
import {FsUtil} from "../../util/FsUtil";
import {CmdUtil, IExecOptions} from "../../util/CmdUtil";
import {PlatformConfig} from "../../PlatformConfig";

export class CommonGen {
    private vesta: Vesta;

    constructor(private config: IProjectConfig) {
        this.vesta = Vesta.getInstance();
    }

    private addSubModule() {
        if (!this.config.repository.common) return;
        let cwd = this.config.name;
        let repo = this.config.repository;
        return CmdUtil.execSync(`git submodule add ${repo.common} ${this.vesta.cmnDirectory}`, {cwd});
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
            execOptions: IExecOptions = {cwd: this.vesta.cmnDirectory};
        GitGen.clone(PlatformConfig.getRepository().cmn, cmnDir);
        GitGen.cleanClonedRepo(cmnDir);
        CmdUtil.execSync(`git init`, execOptions);
        CmdUtil.execSync(`git add .`, execOptions);
        CmdUtil.execSync(`git commit -m Vesta-init`, execOptions);
        CmdUtil.execSync(`git remote add origin ${repository.common}`, execOptions);
        CmdUtil.execSync(`git push -u origin master`, execOptions);
    }

    private cleanClonedRepo(dir) {
        GitGen.cleanClonedRepo(dir);
        FsUtil.remove(`${dir}/package.json`);
    }

    private initWithoutSubModule() {
        let dir = this.config.name,
            destDir = path.join(dir, this.vesta.cmnDirectory);
        FsUtil.mkdir(destDir);
        GitGen.clone(PlatformConfig.getRepository().cmn, destDir);
        this.cleanClonedRepo(destDir);
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
        if (this.config.repository.common) {
            if (!GitGen.commonProjectExists) {
                this.createCommonProject()
            }
            this.addSubModule();
        } else {
            this.initWithoutSubModule();
        }
    }
}
