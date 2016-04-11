import * as path from "path";
import {ProjectGen, IProjectGenConfig} from "../ProjectGen";
import {IFileGenerator} from "../core/IFileGenerator";
import {Util} from "../../util/Util";
import {GitGen} from "../file/GitGen";
import {Vesta} from "../file/Vesta";
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
        return Util.execSync(`git submodule add -b dev ${repo.baseUrl}:${repo.group}/${repo.common}.git ${destDir}`, dir);
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
            cmnDir = repository.common;
        GitGen.clone(`${templateRepo.baseUrl}/${templateRepo.group}/${templateRepo.common}.git`, cmnDir);
        GitGen.cleanClonedRepo(cmnDir);
        Util.execSync(`git init`, cmnDir);
        Util.execSync(`git add .`, cmnDir);
        Util.execSync(`git commit -m Vesta-init`, cmnDir);
        Util.execSync(`git remote add origin ${repository.baseUrl}/${repository.group}/${repository.common}.git`, cmnDir);
        Util.execSync(`git push -u origin master`, cmnDir);
        Util.execSync(`git checkout -b dev`, cmnDir);
        Util.execSync(`git push -u origin dev`, cmnDir);
    }

    private initWithoutSubModule() {
        var dir = this.config.name,
            templateRepo = this.vesta.getProjectConfig().repository,
            destDir = path.join(dir, this.config.type == ProjectGen.Type.ClientSide ? 'src/app/cmn' : 'src/cmn');
        Util.fs.mkdir(destDir);
        GitGen.clone(`${templateRepo.baseUrl}/${templateRepo.group}/${templateRepo.common}.git`, destDir);
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
