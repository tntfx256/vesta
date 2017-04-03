import * as path from "path";
import {IProjectConfig, ProjectGen} from "../ProjectGen";
import {GitGen} from "../file/GitGen";
import {Vesta} from "../file/Vesta";
import {FsUtil} from "../../util/FsUtil";
import {CmdUtil, IExecOptions} from "../../util/CmdUtil";

export class CommonGen {
    private vesta: Vesta;

    constructor(private config: IProjectConfig) {
        this.vesta = Vesta.getInstance();
    }

    private addSubModule() {
        if (!this.config.repository.common) return;
        let dir = this.config.name;
        let destDir = this.config.type == ProjectGen.Type.ClientSide ? 'src/app/cmn' : 'src/cmn';
        let repo = this.config.repository;
        return CmdUtil.execSync(`git submodule add ${GitGen.getRepoUrl(repo.baseUrl, repo.group, repo.common)} ${destDir}`, {cwd: dir});
    }

    /**
     * git init
     * git commit --message=""
     * git remote add origin git@hbtb.ir:group/name.git
     * git push origin
     * git checkout -b dev
     * git push origin dev
     */
    private createCommonProject() {
        let repository = this.config.repository,
            templateRepo = this.vesta.getConfig().repository,
            cmnDir = repository.common,
            execOptions: IExecOptions = {cwd: cmnDir};
        GitGen.clone(GitGen.getRepoUrl(templateRepo.baseUrl, templateRepo.group, templateRepo.common), cmnDir);
        GitGen.cleanClonedRepo(cmnDir);
        CmdUtil.execSync(`git init`, execOptions);
        CmdUtil.execSync(`git add .`, execOptions);
        CmdUtil.execSync(`git commit -m Vesta-init`, execOptions);
        CmdUtil.execSync(`git remote add origin ${GitGen.getRepoUrl(repository.baseUrl, repository.group, repository.common)}`, execOptions);
        CmdUtil.execSync(`git push -u origin master`, execOptions);
        // CmdUtil.execSync(`git checkout -b dev`, execOptions);
        // CmdUtil.execSync(`git push -u origin dev`, execOptions);
    }

    private initWithoutSubModule() {
        let dir = this.config.name,
            templateRepo = this.vesta.getConfig().repository,
            destDir = path.join(dir, this.config.type == ProjectGen.Type.ClientSide ? 'src/app/cmn' : 'src/cmn');
        FsUtil.mkdir(destDir);
        GitGen.clone(GitGen.getRepoUrl(templateRepo.baseUrl, templateRepo.group, templateRepo.common), destDir);
        GitGen.cleanClonedRepo(destDir);
    }

    /**
     * if ( init git project )
     *      if ( first time )   => create dir => clone template => init => branch => push => add submodule
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
