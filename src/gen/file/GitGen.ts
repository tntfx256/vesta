import {IProjectGenConfig, ProjectGen} from "../ProjectGen";
import {Util, IExecSyncResult} from "../../util/Util";
import {ClientAppGen} from "../app/client/ClientAppGen";
import {Question} from "inquirer";
import {Err} from "../../cmn/Err";
import inquirer = require("inquirer");

export interface IRepositoryConfig {
    baseUrl:string;
    group:string;
    name:string;
    common:string;
}

interface ICredentials {
    username:string;
    password:string;
}

export class GitGen {
    private static credentials:ICredentials;
    public static commonProjectExists:boolean = true;

    constructor(private config:IProjectGenConfig) {
    }

    public static clone(repository:string, destination:string = '', branch:string = ''):IExecSyncResult {
        var branchCmd = branch ? ` -b ${branch} ` : ' ';
        return Util.execSync(`git clone${branchCmd}${repository} ${destination}`);
    }

    private static getCredentials():Promise<ICredentials> {
        if (GitGen.credentials) return Promise.resolve(GitGen.credentials);
        return Util.prompt<ICredentials>([
            <Question>{
                type: 'input',
                message: 'Username: ',
                name: 'username'
            },
            <Question>{
                type: 'password',
                message: 'Password: ',
                name: 'password'
            }
        ]).then(answer=> {
            GitGen.credentials = {
                username: answer['username'],
                password: answer['password']
            };
            return GitGen.credentials
        });
    }

    public static convertToSsh(httpUrl:string, useCredential:boolean = true):string {
        var regExpArray = /^https?:\/\/([^:\/]+).*/.exec(httpUrl);
        if (!regExpArray) {
            Util.log.error(`Wrong repository base address: ${httpUrl}`);
            Promise.reject(new Err(Err.Code.WrongInput));
        }
        return `git@${regExpArray[1]}`;
    }

    public static cleanClonedRepo(basePath:string) {
        Util.fs.remove(`${basePath}/.git`);
        Util.fs.remove(`${basePath}/.gitmodule`);
        Util.fs.remove(`${basePath}/src/cmn`);
        Util.fs.remove(`${basePath}/src/app/cmn`);
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