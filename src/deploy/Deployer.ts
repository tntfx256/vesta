import * as fs from "fs-extra";
import * as _ from "lodash";
import {Util} from "../util/Util";
import {Err} from "../cmn/Err";
import {GitGen} from "../gen/file/GitGen";
import {GregorianDate} from "../cmn/date/GregorianDate";
import {IVesta} from "../gen/file/Vesta";
import inquirer = require("inquirer");
import {ProjectGen} from "../gen/ProjectGen";

export interface IDeployHistory {
    date:string;
    type:'deploy'|'backup';
}
export interface IDeployConfig {
    projectName:string;
    deployPath:string;
    repositoryUrl:string;
    history:Array<IDeployHistory>;
}

export class Deployer {
    private static ConfigFile:string;
    private stagingPath:string;
    private vesta:IVesta;

    constructor(private config:IDeployConfig) {
        var date = new GregorianDate();
        this.config.history.push({date: date.format('Y/m/d H:i:s'), type: 'deploy'});
        this.stagingPath = config.projectName;
        Util.fs.remove(this.stagingPath);
        Util.fs.mkdir(config.deployPath);
    }

    public deploy() {
        GitGen.clone(this.config.repositoryUrl, this.stagingPath);
        var vestaJsonFile = `${this.stagingPath}/vesta.json`;
        try {
            this.vesta = <IVesta>JSON.parse(fs.readFileSync(vestaJsonFile, {encoding: 'utf8'}));
        } catch (e) {
            Util.fs.remove(this.stagingPath);
            return Util.log.error(`${vestaJsonFile} not found`);
        }
        this.vesta.config.type == ProjectGen.Type.ClientSide ?
            this.deployClientSideProject() :
            this.deployServerSideProject();
        Util.fs.writeFile(Deployer.ConfigFile, JSON.stringify(this.config, null, 2));
    }

    private deployServerSideProject() {
        var deployPath = `${this.config.deployPath}/${this.config.projectName}`;
        var isAlreadyRunning = fs.existsSync(deployPath);
        Util.execSync(`git submodule update --init src/cmn`, this.stagingPath);
        Util.fs.copy(`${this.stagingPath}/resources/gitignore/src/config/setting.var.ts`, `${this.stagingPath}/src/config/setting.var.ts`);
        Util.fs.copy(`${this.stagingPath}/package.json`, `${this.stagingPath}/build/api/src/package.json`);
        Util.execSync(`npm install`, this.stagingPath);
        Util.execSync(`gulp prod`, this.stagingPath);
        Util.execSync(`npm install --production`, `${this.stagingPath}/build/api/src`);
        if (isAlreadyRunning) {
            Util.execSync(`docker-compose stop -t 5`, deployPath);
            Util.execSync(`docker-compose down`, deployPath);
            Util.execSync(`rm -Rf ${deployPath}`);
        }
        Util.fs.rename(`${this.stagingPath}/build`, deployPath);
        Util.execSync(`docker-compose up -d`, deployPath);
        Util.execSync(`rm -Rf ${this.stagingPath}`);
    }

    private deployClientSideProject() {
        // Util.fs.copy(`${this.projectName}/resources/gitignore/src/app/config/setting.var.ts`, `${this.projectName}/src/app/config/setting.var.ts`);
    }

    private static getProjectName(url:string) {
        var [,group,project]=/.+\/(.+)\/(.+)\.git$/.exec(url);
        return `${group}-${project}`;
    }

    public static getDeployConfig(args:Array<string>):Promise<IDeployConfig> {
        var config:IDeployConfig = <IDeployConfig>{
            history: [],
            deployPath: `app`
        };
        if (!args[0]) {
            Util.log.error('Invalid HTTP url of remote repository');
            return Promise.reject(new Err(Err.Code.WrongInput));
        }
        Util.log.warning('\nWARNING: Make sure that your `master` branch is updated and contains the final changes!\n');
        if (fs.existsSync(args[0])) {
            _.assign(config, Deployer.fetchConfig(args[0]));
        } else {
            config.repositoryUrl = args[0];
            config.projectName = Deployer.getProjectName(config.repositoryUrl);
            if (fs.existsSync(`${config.projectName}.json`)) {
                _.assign(config, Deployer.fetchConfig(`${config.projectName}.json`));
            }
        }
        Deployer.ConfigFile = `${config.projectName}.json`;
        return Promise.resolve(config);
    }

    private static fetchConfig(filename:string):IDeployConfig {
        var config:IDeployConfig = <IDeployConfig>{};
        try {
            config = JSON.parse(fs.readFileSync(filename, {encoding: 'utf8'}));
        } catch (e) {
            Util.log.error(`Deploy config file -${filename}- is corrupted!`);
            return null;
        }
        return config;
    }
}