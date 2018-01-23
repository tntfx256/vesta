import {Deployer, IDeployConfig} from "../deploy/Deployer";
import {Log} from "../util/Log";
import {ArgParser} from "../util/ArgParser";
import * as fs from "fs";
import {readJsonFile, writeFile} from "../util/FsUtil";
import {Culture} from "../cmn/core/Culture";

export class Deploy {

    private static getProjectName(url: string) {
        let [, group, project] = /.+\/(.+)\/(.+)\.git$/.exec(url);
        return `${group}-${project}`;
    }

    static init() {
        const argParser = ArgParser.getInstance();
        if (argParser.hasHelp()) {
            return Deploy.help();
        }
        let config: IDeployConfig = <IDeployConfig>{
            history: [],
            args: [],
            deployPath: `app`
        };
        config.branch = argParser.get('--branch', 'master');
        let path = argParser.get();
        if (!path) {
            return Log.error('Invalid file name or address of remote repository');
        }
        if (fs.existsSync(path)) {
            let prevDeployConfig = readJsonFile<IDeployConfig>(path);
            if (!prevDeployConfig) return;
            Object.assign(config, prevDeployConfig);
        } else {
            config.repositoryUrl = path;
            config.projectName = Deploy.getProjectName(config.repositoryUrl);
        }
        (new Deployer(config)).deploy();
        // saving config file
        let date = Culture.getDateTimeInstance();
        config.history.push({date: date.format('Y/m/d H:i:s'), type: 'deploy', branch: config.branch});
        writeFile(`${config.projectName}.json`, JSON.stringify(config, null, 2));
    }

    static help() {
        Log.write(`
Usage: vesta deploy <PATH> [options...]

Deploy a project from remote repository

    PATH        The url to the git repository or The name of file 
                  that the previous deploy generates it
Options:
    --branch    Name of the git branch that deploy operation should use {default: master}
`);
    }
}