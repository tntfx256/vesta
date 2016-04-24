import * as fs from "fs-extra";
import * as _ from "lodash";
import {Err} from "../cmn/Err";
import {GitGen} from "../gen/file/GitGen";
import {GregorianDate} from "../cmn/date/GregorianDate";
import {IVesta} from "../gen/file/Vesta";
import {ProjectGen} from "../gen/ProjectGen";
import {FsUtil} from "../util/FsUtil";
import {Log} from "../util/Log";
import {CmdUtil, IExecOptions} from "../util/CmdUtil";
import inquirer = require("inquirer");
var isRoot = require('is-root');

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
        FsUtil.remove(this.stagingPath);
        FsUtil.mkdir(config.deployPath);
    }

    public deploy() {
        GitGen.clone(this.config.repositoryUrl, this.stagingPath);
        var vestaJsonFile = `${this.stagingPath}/vesta.json`;
        try {
            this.vesta = <IVesta>JSON.parse(fs.readFileSync(vestaJsonFile, {encoding: 'utf8'}));
        } catch (e) {
            FsUtil.remove(this.stagingPath);
            return Log.error(`${vestaJsonFile} not found`);
        }
        this.vesta.config.type == ProjectGen.Type.ClientSide ?
            this.deployClientSideProject() :
            this.deployServerSideProject();
        FsUtil.writeFile(Deployer.ConfigFile, JSON.stringify(this.config, null, 2));
    }

    private deployServerSideProject() {
        var deployPath = `${this.config.deployPath}/${this.config.projectName}`;
        var isAlreadyRunning = fs.existsSync(deployPath);
        var execOption:IExecOptions = {cwd: this.stagingPath};
        CmdUtil.execSync(`git submodule update --init src/cmn`, execOption);
        FsUtil.copy(`${this.stagingPath}/resources/gitignore/src/config/setting.var.ts`, `${this.stagingPath}/src/config/setting.var.ts`);
        FsUtil.copy(`${this.stagingPath}/package.json`, `${this.stagingPath}/build/api/src/package.json`);
        CmdUtil.execSync(`npm install`, execOption);
        CmdUtil.execSync(`gulp prod`, execOption);
        CmdUtil.execSync(`npm install --production`, {cwd: `${this.stagingPath}/build/api/src`});
        execOption.cwd = deployPath;
        if (isAlreadyRunning) {
            CmdUtil.execSync(`docker-compose stop -t 5`, execOption);
            CmdUtil.execSync(`docker-compose down`, execOption);
            CmdUtil.execSync(`rm -Rf ${deployPath}`);
        }
        FsUtil.rename(`${this.stagingPath}/build`, deployPath);
        CmdUtil.execSync(`docker-compose up -d`, execOption);
        CmdUtil.execSync(`rm -Rf ${this.stagingPath}`);
    }

    private deployClientSideProject() {
        // FsUtil.copy(`${this.projectName}/resources/gitignore/src/app/config/setting.var.ts`, `${this.projectName}/src/app/config/setting.var.ts`);
    }

    private static getProjectName(url:string) {
        var [,group,project]=/.+\/(.+)\/(.+)\.git$/.exec(url);
        return `${group}-${project}`;
    }

    public static getDeployConfig(args:Array<string>):Promise<IDeployConfig> {
        if (!isRoot()) {
            Log.error('You must run this command as root!');
            return Promise.reject(new Err(Err.Code.OperationFailed));
        }
        var config:IDeployConfig = <IDeployConfig>{
            history: [],
            deployPath: `app`
        };
        if (!args[0]) {
            Log.error('Invalid HTTP url of remote repository');
            return Promise.reject(new Err(Err.Code.WrongInput));
        }
        Log.warning('\nWARNING: Make sure that your `master` branch is updated and contains the final changes!\n');
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

    public static fetchConfig(filename:string):IDeployConfig {
        var config:IDeployConfig = <IDeployConfig>{};
        try {
            config = JSON.parse(fs.readFileSync(filename, {encoding: 'utf8'}));
        } catch (e) {
            Log.error(`Deploy config file -${filename}- is corrupted!`);
            return null;
        }
        return config;
    }
}