import {Question} from "inquirer";
import {FsUtil} from "../../util/FsUtil";
import {CmdUtil, IExecSyncResult} from "../../util/CmdUtil";
import {Util} from "../../util/Util";
import {V2App} from "../app/V2App";

export interface IRepositoryConfig {
    baseUrl: string;
    group: string;
    name: string;
    common?: string;
}

export class GitGen {
    public static commonProjectExists: boolean = true;

    public static clone(repository: string, destination: string = '', branch: string = ''): IExecSyncResult {
        let branchCmd = branch ? ` -b ${branch} ` : ' ';
        return CmdUtil.execSync(`git clone${branchCmd}${repository} ${destination}`);
    }

    public static getRepoUrl(baseUrl: string, group: string, repository: string): string {
        return /^git.+/.exec(baseUrl) ?
            `${baseUrl}:${group}/${repository}.git` :
            `${baseUrl}/${group}/${repository}.git`;
    }

    public static cleanClonedRepo(basePath: string) {
        FsUtil.remove(`${basePath}/.git`);
        if (!V2App.isActive) {
            FsUtil.remove(`${basePath}/.gitmodule`);
            FsUtil.remove(`${basePath}/src/cmn`);
            FsUtil.remove(`${basePath}/src/app/cmn`);
        }
    }

    public static getGeneratorConfig(name: string, group?: string): Promise<IRepositoryConfig> {
        return Util.prompt(<Question>{
            type: 'confirm',
            name: 'initRepository',
            message: 'Init git repository: '
        }).then(answer => {
            if (!answer['initRepository']) return Promise.resolve({});
            let qs: Array<Question> = [<Question>{
                type: 'input',
                name: 'baseUrl',
                message: 'Repository base url:',
                default: 'https://git.hbtb.ir'
            }];
            if (!group) {
                qs.push(<Question>{
                    type: 'input',
                    name: 'group',
                    message: 'Group name of the remote git repository: '
                });
            }
            if (!V2App.isActive) {
                qs.push(<Question>{
                    type: 'input',
                    name: 'projectName',
                    message: `Remote repository name: (${name}Api, ${name}Web, ...)`,
                    default: name
                });
                qs.push(<Question>{
                    type: 'input',
                    name: 'common',
                    message: 'Remote repository name for common source: ',
                    default: `${name}CommonCode`
                });
                qs.push(<Question>{
                    type: 'confirm',
                    name: 'commonExists',
                    message: 'Common project already exists: '
                });
            }
            return Util.prompt<any>(qs).then(answer => {
                let repoConfig: IRepositoryConfig = <IRepositoryConfig>{};
                if (!group && !answer['group']) return repoConfig;
                GitGen.commonProjectExists = answer['commonExists'];
                repoConfig = <IRepositoryConfig>{
                    baseUrl: answer['baseUrl'],
                    group: group || answer['group']
                };
                if (!V2App.isActive) {
                    repoConfig.name = answer['projectName'];
                    repoConfig.common = answer['common'];
                } else {
                    repoConfig.name = name;
                }
                return repoConfig;
            });
        })
    }
}