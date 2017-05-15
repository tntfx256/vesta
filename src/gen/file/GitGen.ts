import {Question} from "inquirer";
import {FsUtil} from "../../util/FsUtil";
import {CmdUtil} from "../../util/CmdUtil";
import {Util} from "../../util/Util";

export interface IRepositoryConfig {
    common?: string;
    main?: string;
}

export class GitGen {
    public static commonProjectExists: boolean = true;

    public static clone(repository: string, destination: string = '', branch: string = ''): string {
        let branchCmd = branch ? `-b ${branch}` : '';
        return CmdUtil.execSync(`git clone ${branchCmd} ${repository} ${destination}`);
    }

    public static getRepoName(repoUrl: string): string {
        let result = /([^/]+)\.git$/i.exec(repoUrl);
        if (result) return result[1];
        return '';
    }

    public static cleanClonedRepo(basePath: string) {
        FsUtil.remove(`${basePath}/.git`);
        FsUtil.remove(`${basePath}/CHANGELOG.md`);
        FsUtil.remove(`${basePath}/LICENSE`);
        FsUtil.remove(`${basePath}/README.md`);
    }

    public static getGeneratorConfig(name: string): Promise<IRepositoryConfig> {
        return name ?
            Util.prompt<{ initRepository: boolean }>(<Question>{
                type: 'confirm',
                name: 'initRepository',
                message: 'Init git repository: '
            }).then(answer => answer.initRepository ? GitGen.getRepoConfig() : Promise.resolve({})) :
            GitGen.getRepoConfig();
    }

    private static getRepoConfig(): Promise<IRepositoryConfig> {
        let qs: Array<Question> = [
            <Question>{
                type: 'input',
                name: 'main',
                message: 'Repository URL (Main Project): '
            },
            <Question>{
                type: 'input',
                name: 'common',
                message: 'Repository url (Common Code): '
            },
            <Question>{
                type: 'confirm',
                name: 'commonExists',
                message: 'Common project already exists: '
            }];
        return Util.prompt<{ main: string; common: string, commonExists: boolean }>(qs).then(answer => {
            GitGen.commonProjectExists = answer.commonExists;
            return <IRepositoryConfig>{
                main: answer.main,
                common: answer.common
            };
        });
    }
}