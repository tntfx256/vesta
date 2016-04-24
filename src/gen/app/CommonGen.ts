import * as path from "path";
import {ProjectGen, IProjectGenConfig} from "../ProjectGen";
import {IFileGenerator} from "../core/IFileGenerator";
import {GitGen} from "../file/GitGen";
import {Vesta} from "../file/Vesta";
import {FsUtil} from "../../util/FsUtil";
import {CmdUtil, IExecOptions} from "../../util/CmdUtil";
import resolve = Promise.resolve;

export class CommonGen implements IFileGenerator {
    private vesta:Vesta;

    constructor(private config:IProjectGenConfig) {
        this.vesta = Vesta.getInstance();
    }

    private addSubModule() {
        if (!this.config.repository.common) return;
        var dir = this.config.name;
        var destDir = this.config.type == ProjectGen.Type.ClientSide ? 'src/app/cmn' : 'src/cmn';
        var repo = this.config.repository;
        return CmdUtil.execSync(`git submodule add -b dev ${GitGen.getRepoUrl(repo.baseUrl, repo.group, repo.common)} ${destDir}`, {cwd: dir});
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
        var repository = this.config.repository,
            templateRepo = this.vesta.getProjectConfig().repository,
            cmnDir = repository.common,
            execOptions:IExecOptions = {cwd: cmnDir};
        GitGen.clone(GitGen.getRepoUrl(templateRepo.baseUrl, templateRepo.group, templateRepo.common), cmnDir);
        GitGen.cleanClonedRepo(cmnDir);
        CmdUtil.execSync(`git init`, execOptions);
        CmdUtil.execSync(`git add .`, execOptions);
        CmdUtil.execSync(`git commit -m Vesta-init`, execOptions);
        CmdUtil.execSync(`git remote add origin ${GitGen.getRepoUrl(repository.baseUrl, repository.group, repository.common)}`, execOptions);
        CmdUtil.execSync(`git push -u origin master`, execOptions);
        CmdUtil.execSync(`git checkout -b dev`, execOptions);
        CmdUtil.execSync(`git push -u origin dev`, execOptions);
    }

    private initWithoutSubModule() {
        var dir = this.config.name,
            templateRepo = this.vesta.getProjectConfig().repository,
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
            return this.addSubModule();
        }
        this.initWithoutSubModule();
    }
}
