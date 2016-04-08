import * as fs from "fs-extra";
import {Util} from "../util/Util";
import {Err} from "../cmn/Err";
import {GitGen} from "../gen/file/GitGen";
import {GregorianDate} from "../cmn/date/GregorianDate";
import {IProjectGenConfig, ProjectGen} from "../gen/ProjectGen";
import {IVesta} from "../gen/file/Vesta";
import inquirer = require("inquirer");

export interface IDeployConfig {
    repositoryUrl:string;
    prevDeployPath?:string;
}

export class Deployer {
    private static ConfigFile = 'vesta-deploy.json';
    private projectName:string;

    constructor(private config:IDeployConfig) {
        var [,group,project]=/.+\/(.+)\/(.+)\.git$/.exec(config.repositoryUrl);
        this.projectName = `${group}-${project}`;
        Deployer.ConfigFile = `${this.projectName}.json`;
        if (fs.existsSync(Deployer.ConfigFile)) {
            try {
                var cfg:IDeployConfig = JSON.parse(fs.readFileSync(Deployer.ConfigFile, {encoding: 'utf8'}));
                config.prevDeployPath = cfg.prevDeployPath;
            } catch (e) {

            }
        }
    }

    public deploy() {
        var datePostFix = (new GregorianDate()).format('Ymd-His'),
            projectName = `${this.projectName}_${datePostFix}`,
            deployPath = `/app/${projectName}`,
            config:IProjectGenConfig;
        Util.fs.mkdir('/app');
        if (fs.existsSync(projectName)) {
            Util.fs.remove(projectName);
        }
        GitGen.getRepoUrl(this.config.repositoryUrl)
            .then(url=>GitGen.clone(url, projectName, 'master'))
            .then(()=>Util.exec(`git submodule foreach git pull origin master`, projectName))
            .then(()=> {
                Util.fs.copy(`${projectName}/resources/gitignore/src/config/setting.var.ts`, `${projectName}/src/config/setting.var.ts`);
                var jsonFile = `${projectName}/vesta.json`,
                    vesta:IVesta = <IVesta>{};
                try {
                    vesta = <IVesta>JSON.parse(fs.readFileSync(jsonFile, {encoding: 'utf8'}));
                    config = vesta.config;
                } catch (e) {
                }
            })
            .then(()=>Util.run(`npm install`, projectName, true))
            .then(()=>config.type == ProjectGen.Type.ClientSide ? Util.run(`bower install`, projectName, true) : null)
            .then(()=>Util.run(`gulp prod`, projectName, true))
            .then(()=> {
                Util.fs.rename(`${projectName}/build`, deployPath);
                return Util.exec(`docker-compose build`, deployPath);
            })
            .then(()=>this.config.prevDeployPath ? Util.exec(`docker-compose stop -t 2`, this.config.prevDeployPath) : null)
            .then(()=> Util.exec(`docker-compose up -d`, deployPath))
            .then(()=> {
                if (this.config.prevDeployPath) {
                    Util.exec(`docker-compose down --rmi local`, this.config.prevDeployPath)
                        .then(()=>Util.exec(`rm -Rf ${this.config.prevDeployPath}`));
                }
                Util.exec(`rm -Rf ${projectName}`);
                this.config.prevDeployPath = deployPath;
                Util.fs.writeFile(Deployer.ConfigFile, JSON.stringify(this.config, null, 4));
            })
    }

    public static getDeployConfig(args:Array<string>):Promise<IDeployConfig> {
        var config:IDeployConfig = <IDeployConfig>{};
        if (!args[0]) {
            Util.log.error('Invalid HTTP url of remote repository');
            return Promise.reject(new Err(Err.Code.WrongInput));
        }
        Util.log.warning('\nWARNING: Make sure that your `master` branch is updated and contains the final changes!\n');
        config.repositoryUrl = args[0];
        return Promise.resolve(config);
    }
}