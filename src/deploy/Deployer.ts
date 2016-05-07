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
import {Util} from "../util/Util";
import {Question} from "inquirer";
import inquirer = require("inquirer");

export interface IDeployHistory {
    date:string;
    type:'deploy'|'backup';
}

export interface IDeployConfig {
    projectName:string;
    deployPath:string;
    lbPath:string;
    ssl:boolean;
    repositoryUrl:string;
    history:Array<IDeployHistory>;
}

export class Deployer {
    private static ConfigFile:string;
    private cloningPath:string;
    private vesta:IVesta;
    private showUpdateWarning = false;
    private isClientSide = false;

    constructor(private config:IDeployConfig) {
        var date = new GregorianDate();
        this.config.history.push({date: date.format('Y/m/d H:i:s'), type: 'deploy'});
        this.cloningPath = config.projectName;
        FsUtil.remove(this.cloningPath);
        FsUtil.mkdir(config.deployPath);
    }

    public deploy() {
        GitGen.clone(this.config.repositoryUrl, this.cloningPath);
        var execOption:IExecOptions = {cwd: this.cloningPath};
        CmdUtil.execSync(`git checkout master`, execOption);
        var vestaJsonFile = `${this.cloningPath}/vesta.json`;
        try {
            this.vesta = <IVesta>JSON.parse(fs.readFileSync(vestaJsonFile, {encoding: 'utf8'}));
        } catch (e) {
            FsUtil.remove(this.cloningPath);
            return Log.error(`${vestaJsonFile} not found`);
        }
        this.isClientSide = this.vesta.config.type == ProjectGen.Type.ClientSide;
        var submodulePath = this.isClientSide ? 'src/app/cmn' : 'src/cmn',
            varConfigFilePath = this.isClientSide ? 'src/app/config/setting.var.ts' : 'src/config/setting.var.ts';
        CmdUtil.execSync(`git submodule update --init ${submodulePath}`, execOption);
        CmdUtil.execSync(`git submodule foreach git checkout master`, execOption);
        FsUtil.copy(`${this.cloningPath}/resources/gitignore/${varConfigFilePath}`, `${this.cloningPath}/${varConfigFilePath}`);
        this.isClientSide ?
            this.deployClientSideProject() :
            this.deployServerSideProject();
        this.updateLoadBalancer();
        FsUtil.writeFile(Deployer.ConfigFile, JSON.stringify(this.config, null, 2));
    }

    private deployServerSideProject() {
        var deployPath = `${this.config.deployPath}/${this.config.projectName}`;
        var isAlreadyRunning = fs.existsSync(deployPath);
        var execOption:IExecOptions = {cwd: this.cloningPath};
        FsUtil.copy(`${this.cloningPath}/package.json`, `${this.cloningPath}/build/api/src/package.json`);
        CmdUtil.execSync(`npm install`, execOption);
        CmdUtil.execSync(`gulp deploy`, execOption);
        CmdUtil.execSync(`npm install --production`, {cwd: `${this.cloningPath}/build/api/src`});
        execOption.cwd = deployPath;
        if (isAlreadyRunning) {
            CmdUtil.execSync(`docker-compose stop -t 5`, execOption);
            CmdUtil.execSync(`docker-compose down`, execOption);
            CmdUtil.execSync(`rm -Rf ${deployPath}`);
        }
        FsUtil.rename(`${this.cloningPath}/build`, deployPath);
        CmdUtil.execSync(`docker-compose up -d`, execOption);
        CmdUtil.execSync(`rm -Rf ${this.cloningPath}`);
    }

    private deployClientSideProject() {
        var deployPath = `${this.config.deployPath}/${this.config.projectName}`;
        var isAlreadyRunning = fs.existsSync(deployPath);
        var execOption:IExecOptions = {cwd: this.cloningPath};
        var buildPath = this.cloningPath + '/build';
        var confFile = this.config.ssl ? 'https.conf' : 'http.conf';
        CmdUtil.execSync(`npm install`, execOption);
        if (fs.existsSync(`${this.cloningPath}/bower.json`)) {
            CmdUtil.execSync(`bower install`, execOption);
        }
        CmdUtil.execSync(`gulp deploy`, execOption);
        CmdUtil.execSync(`npm install --production`, {cwd: `${buildPath}/app/server`});
        if (this.config.lbPath) {
            FsUtil.rename(`${buildPath}/docker/compose-prod-lb.yml`, `${buildPath}/docker-compose.yml`);
            if (fs.existsSync(`${buildPath}/${this.config.projectName}.conf`)) {
                Util.prompt<{ow:boolean}>(<Question>{
                    name: 'ow',
                    type: 'confirm',
                    message: `Overwrite ${this.config.projectName}.conf? `
                }).then(answer=> {
                    if (answer.ow) {
                        FsUtil.remove(`${this.config.lbPath}/${this.config.projectName}.conf`);
                        FsUtil.rename(`${buildPath}/docker/nginx/load-balancer/${confFile}`, `${this.config.lbPath}/${this.config.projectName}.conf`);
                        this.showUpdateWarning = true;
                    }
                })
            } else {
                FsUtil.rename(`${buildPath}/docker/nginx/load-balancer/${confFile}`, `${this.config.lbPath}/${this.config.projectName}.conf`);
                this.showUpdateWarning = true;
            }
        } else {
            FsUtil.rename(`${buildPath}/docker/compose-prod-sa.yml`, `${buildPath}/docker-compose.yml`);
            FsUtil.mkdir(`${buildPath}/nginx`);
            FsUtil.rename(`${buildPath}/docker/nginx/ssl`, `${buildPath}/nginx/ssl`);
            FsUtil.rename(`${buildPath}/docker/nginx/stand-alone/${confFile}`, `${buildPath}/nginx/nginx.conf`);
            FsUtil.rename(`${buildPath}/docker/nginx/stand-alone/Dockerfile`, `${buildPath}/nginx/Dockerfile`);
        }
        FsUtil.rename(`${buildPath}/docker/pm2`, `${buildPath}/pm2`);
        FsUtil.rename(`${buildPath}/app`, `${buildPath}/pm2/app`);
        if (this.config.lbPath && this.config.ssl) {
            FsUtil.rename(`${buildPath}/docker/nginx/ssl`, `${buildPath}/pm2/app/ssl`);
        }
        FsUtil.remove(`${buildPath}/docker`, `${buildPath}/tmp`);
        execOption.cwd = deployPath;
        if (isAlreadyRunning) {
            CmdUtil.execSync(`docker-compose stop -t 5`, execOption);
            CmdUtil.execSync(`docker-compose down`, execOption);
            CmdUtil.execSync(`rm -Rf ${deployPath}`);
        }
        FsUtil.rename(buildPath, deployPath);
        CmdUtil.execSync(`docker-compose up -d`, execOption);
        CmdUtil.execSync(`rm -Rf ${this.cloningPath}`);
        if (this.showUpdateWarning) {
            this.showLbWarning();
        }
    }

    private showLbWarning() {
        var prefix = this.config.projectName.replace(/\-+/g, '').toLocaleLowerCase();
        var points = [];
        if (this.isClientSide) {
            points.push(`- Add '${prefix}_network'  to the load balancer's networks`);
            points.push(`- Add '${prefix}_web_1'    to the load balancer's external_links`);
            points.push(`- Add '${prefix}_html'     to the load balancer's volumes list`);
            if (this.config.ssl) {
                points.push(`- Add '${prefix}_ssl'      to the load balancer's volumes list`);
            }
        }
        points.push(`- Restart your NGinx container for the ${this.config.projectName}.conf file to take effect!\n`);
        Log.warning(`\nWARNING! Do NOT forget to\n\t${points.join('\n\t')}`);
    }

    private updateLoadBalancer() {
        if (!this.config.lbPath) return;
        var confFile = `${this.cloningPath}/resources/docker/nginx/lb.conf`;
        if (!fs.existsSync(confFile)) return;

    }

    private static getProjectName(url:string) {
        var [,group,project]=/.+\/(.+)\/(.+)\.git$/.exec(url);
        return `${group}-${project}`;
    }

    public static getDeployConfig(args:Array<string>):Promise<IDeployConfig> {
        if (CmdUtil.execSync(`gulp -v`).code) {
            Log.error('You must install gulp-cli!');
            CmdUtil.execSync(`sudo npm install -g gulp-cli`);
        }
        var config:IDeployConfig = <IDeployConfig>{
            history: [],
            deployPath: `app`,
            ssl: true
        };
        if (!args[0]) {
            Log.error('Invalid file name or HTTP url of remote repository');
            return Promise.reject(new Err(Err.Code.WrongInput));
        }
        Log.warning('\nWARNING: Make sure that your `master` branch is updated and contains the final changes!\n');
        if (fs.existsSync(args[0])) {
            _.assign(config, Deployer.fetchConfig(args[0]));
            Deployer.ConfigFile = `${config.projectName}.json`;
            return Promise.resolve(config);
        } else {
            config.repositoryUrl = args[0];
            config.projectName = Deployer.getProjectName(config.repositoryUrl);
            Deployer.ConfigFile = `${config.projectName}.json`;
            if (fs.existsSync(`${config.projectName}.json`)) {
                _.assign(config, Deployer.fetchConfig(`${config.projectName}.json`));
                return Promise.resolve(config);
            }
            return Util.prompt<{ssl:boolean,lbPath:string}>([
                <Question>{
                    type: 'confirm',
                    name: 'ssl',
                    message: 'Use ssl? '
                },
                <Question>{
                    type: 'input',
                    name: 'lbPath',
                    message: 'Path to the nginx conf.d directory (blank = stand alone): '
                }
            ]).then(answer=> {
                config.lbPath = answer.lbPath;
                config.ssl = answer.ssl;
                return config;
            })
        }
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