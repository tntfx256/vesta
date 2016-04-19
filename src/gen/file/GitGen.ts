import {IProjectGenConfig, ProjectGen} from "../ProjectGen";
import {ClientAppGen} from "../app/client/ClientAppGen";
import {Question} from "inquirer";
import {Fs} from "../../util/Fs";
import {IExecSyncResult, Cmd} from "../../util/Cmd";
import {Util} from "../../util/Util";
import inquirer = require("inquirer");

export interface IRepositoryConfig {
    baseUrl:string;
    group:string;
    name:string;
    common:string;
}

export class GitGen {
    public static commonProjectExists:boolean = true;

    public static clone(repository:string, destination:string = '', branch:string = ''):IExecSyncResult {
        var branchCmd = branch ? ` -b ${branch} ` : ' ';
        return Cmd.execSync(`git clone${branchCmd}${repository} ${destination}`);
    }

    public static getRepoUrl(baseUrl:string, group:string, repository:string):string {
        return /^git.+/.exec(baseUrl) ?
            `${baseUrl}:${group}/${repository}.git` :
            `${baseUrl}/${group}/${repository}.git`;
    }

    public static cleanClonedRepo(basePath:string) {
        Fs.remove(`${basePath}/.git`);
        Fs.remove(`${basePath}/.gitmodule`);
        Fs.remove(`${basePath}/src/cmn`);
        Fs.remove(`${basePath}/src/app/cmn`);
    }

    public static getGeneratorConfig(appConfig:IProjectGenConfig):Promise<IProjectGenConfig> {
        return Util.prompt(<Question>{
            type: 'confirm',
            name: 'initRepository',
            message: 'Init git repository: '
        }).then(answer=> {
            if (!answer['initRepository']) return Promise.resolve(appConfig);
            var qs:Array<Question> = [<Question>{
                type: 'input',
                name: 'baseUrl',
                message: 'Repository base url:',
                default: 'http://hbtb.ir:8080'
            }];
            if (!appConfig.repository.group) {
                qs.push(<Question>{
                    type: 'input',
                    name: 'group',
                    message: 'Group name of the remote git repository: '
                });
            }
            var defaultProjectName = `${appConfig.name}ApiServer`;
            if (appConfig.type == ProjectGen.Type.ClientSide) {
                defaultProjectName = appConfig.name + (appConfig.client.platform == ClientAppGen.Platform.Browser ? 'WebInterface' : 'App');
            }
            qs.push(<Question>{
                type: 'input',
                name: 'projectName',
                message: 'Remote repository name: ',
                default: defaultProjectName
            });
            qs.push(<Question>{
                type: 'input',
                name: 'common',
                message: 'Remote repository name for common source: ',
                default: `${appConfig.name}CommonCode`
            });
            qs.push(<Question>{
                type: 'confirm',
                name: 'commonExists',
                message: 'Common project already exists: '
            });
            return Util.prompt(qs).then(answer=> {
                if (!appConfig.repository.group && !answer['group']) return appConfig;
                appConfig.name = answer['projectName'];
                GitGen.commonProjectExists = answer['commonExists'];
                appConfig.repository = <IRepositoryConfig>{
                    baseUrl: answer['baseUrl'],
                    group: answer['group'],
                    name: appConfig.name,
                    common: answer['common']
                };
                return appConfig;
            });
        })
    }
}