import {ProjectGen, IProjectGenConfig} from "../ProjectGen";
import {IFileGenerator} from "../core/IFileGenerator";
import {Util} from "../../util/Util";
import {GitGen} from "../file/GitGen";
import {Config} from "../../Config";
import resolve = Promise.resolve;

export class CommonGen implements IFileGenerator {

    constructor(private config:IProjectGenConfig) {
    }

    /**
     * git init
     * git commit --message=""
     * git remote add origin git@hbtb.ir:group/name.git
     * git push origin
     * git checkout -b dev
     * git push origin dev
     */
    private initFirstTimeCommonProject():Promise<any> {
        var repository = this.config.repository,
            cmnDir = repository.common;
        return GitGen.getRepoUrl(Config.repository.baseRepoUrl)
            .then(url=> {
                return GitGen.clone(`${url}/${Config.repository.group}/commonCodeTemplate.git`, cmnDir)
            })
            .then(()=> GitGen.cleanClonedRepo(cmnDir))
            .then(()=> Util.exec(`git init`, cmnDir))
            .then(()=>Util.exec(`git add .`, cmnDir))
            .then(()=>Util.exec(`git commit -m Vesta`, cmnDir))
            .then(()=>GitGen.getRepoUrl(repository.baseRepoUrl, true))
            .then((sshUrl)=>Util.exec(`git remote add origin ${sshUrl}:${repository.group}/${repository.common}.git`, cmnDir))
            .then(()=>Util.exec(`git push -u origin master`, cmnDir))
            .then(()=>Util.exec(`git checkout -b dev`, cmnDir))
            .then(()=>Util.exec(`git push -u origin dev`, cmnDir));
    }

    public addSubModule():Promise<any> {
        if (!this.config.repository.common) return resolve();
        var dir = this.config.name,
            destDir = this.config.type == ProjectGen.Type.ClientSide ? 'src/app/cmn' : 'src/cmn';
        return GitGen.getRepoUrl(Config.repository.baseRepoUrl, true)
            .then(url=>Util.exec(`git submodule add -b dev ${url}:${this.config.repository.group}/${this.config.repository.common}.git ${destDir}`, dir));
    }

    private initWithoutSubModule():Promise<any> {
        var dir = this.config.name,
            destDir = this.config.type == ProjectGen.Type.ClientSide ? 'src/app/cmn' : 'src/cmn';
        Util.fs.mkdir(destDir, `${dir}/fw/common`);
        return GitGen.getRepoUrl(Config.repository.baseRepoUrl)
            .then(url=>GitGen.clone(`${url}/${Config.repository.group}/commonCodeTemplate.git`, `${dir}/fw/common`))
            .then(()=>Util.fs.copy(`${dir}/fw/common`, destDir));
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
    public generate():Promise<any> {
        if (this.config.repository.common) {
            if (this.config.repository['firstTime']) {
                return this.initFirstTimeCommonProject();
            }
            return Promise.resolve();
        }
        return this.initWithoutSubModule();
    }
}
