import {IProjectGenConfig, ProjectGen} from "../ProjectGen";
import {Util} from "../../util/Util";
import {ClientAppGen} from "../app/client/ClientAppGen";
import {Question} from "inquirer";
import inquirer = require("inquirer");

export interface IRepositoryConfig {
    baseRepoUrl:string;
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

    constructor(private config:IProjectGenConfig) {
    }

    public static clone(repository:string, destination:string = '', branch:string = ''):Promise<any> {
        var branchCmd = branch ? ` -b ${branch} ` : ' ';
        return Util.exec(`git clone${branchCmd}${repository} ${destination}`);
    }

    public static getCredentials():Promise<ICredentials> {
        if (GitGen.credentials) return Promise.resolve(GitGen.credentials);
        return new Promise<any>((resolve, reject)=> {
            inquirer.prompt([
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
            ], answer=> {
                GitGen.credentials = {
                    username: answer['username'],
                    password: answer['password']
                };
                resolve(GitGen.credentials);
            })
        });
    }

    public static getRepoUrl(httpUrl:string, useSSH:boolean = false):Promise<string> {
        if (useSSH) {
            let host = /^https?:\/\/([^:\/]+).*/.exec(httpUrl)[1];
            return Promise.resolve(`git@${host}`);
        }
        return GitGen.getCredentials()
            .then(credentials=>Promise.resolve(httpUrl.replace(/(https?:\/\/)(.+)/, `$1${credentials.username}:${credentials.password}@$2`)));
    }

    public static cleanClonedRepo(basePath:string):Promise<any> {
        Util.fs.remove(`${basePath}/.git`);
        Util.fs.remove(`${basePath}/.gitmodule`);
        Util.fs.remove(`${basePath}/src/cmn`);
        Util.fs.remove(`${basePath}/src/app/cmn`);
        return Promise.resolve();
    }

    public static getGeneratorConfig(appConfig:IProjectGenConfig):Promise<IProjectGenConfig> {
        return new Promise<IProjectGenConfig>((resolve)=> {
            inquirer.prompt(<Question>{
                type: 'confirm',
                name: 'initRepository',
                message: 'Init git repository? '
            }, answer=> {
                if (!answer['initRepository']) return resolve(appConfig);
                var qs:Array<Question> = [<Question>{
                    type: 'input',
                    name: 'baseRepoUrl',
                    message: 'Remote repository base url: (http://example.com:9000)'
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
                    name: 'firstTime',
                    message: 'Common project already exists: '
                });
                inquirer.prompt(qs, answer=> {
                    if (!appConfig.repository.group) {
                        if (!answer['group']) return resolve(appConfig);
                    }
                    appConfig.name = answer['projectName'];
                    appConfig.repository = <IRepositoryConfig>{
                        firstTime: !answer['firstTime'],
                        baseRepoUrl: answer['baseRepoUrl'],
                        group: answer['group'],
                        name: appConfig.name,
                        common: answer['common']
                    };
                    resolve(appConfig);
                });
            });
        });
    }
}