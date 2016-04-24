import {IProjectGenConfig, ProjectGen} from "../ProjectGen";
import {ClientAppGen} from "../app/client/ClientAppGen";
import {Question} from "inquirer";
import {FsUtil} from "../../util/FsUtil";
import {IExecSyncResult, CmdUtil} from "../../util/CmdUtil";
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
        return CmdUtil.execSync(`git clone${branchCmd}${repository} ${destination}`);
    }

    public static getRepoUrl(baseUrl:string, group:string, repository:string):string {
        return /^git.+/.exec(baseUrl) ?
            `${baseUrl}:${group}/${repository}.git` :
            `${baseUrl}/${group}/${repository}.git`;
    }

    public static cleanClonedRepo(basePath:string) {
        FsUtil.remove(`${basePath}/.git`);
        FsUtil.remove(`${basePath}/.gitmodule`);
        FsUtil.remove(`${basePath}/src/cmn`);
        FsUtil.remove(`${basePath}/src/app/cmn`);
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
                default: 'https://git.hbtb.ir'
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
                    group: appConfig.repository.group || answer['group'],
                    name: appConfig.name,
                    common: answer['common']
                };
                return appConfig;
            });
        })
    }
}