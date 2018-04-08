import { Question } from "inquirer";
import { execute } from "../../util/CmdUtil";
import { ask } from "../../util/Util";

export interface IRepositoryConfig {
    common?: string;
    main?: string;
}

export class GitGen {
    public static commonProjectExists: boolean = true;

    public static clone(repository: string, destination: string = "", branch: string = ""): string {
        const branchCmd = branch ? `-b ${branch}` : "";
        return execute(`git clone ${branchCmd} ${repository} ${destination}`);
    }

    public static getRepoName(repoUrl: string): string {
        const result = /([^/]+)\.git$/i.exec(repoUrl);
        if (result) { return result[1]; }
        return "";
    }

    public static getGeneratorConfig(name: string): Promise<IRepositoryConfig> {
        return name ?
            ask<{ initRepository: boolean }>({
                message: "Init git repository: ",
                name: "initRepository",
                type: "confirm",
            } as Question).then((answer) => answer.initRepository ? GitGen.getRepoConfig() : Promise.resolve({})) :
            GitGen.getRepoConfig();
    }

    private static getRepoConfig(): Promise<IRepositoryConfig> {
        const qs: Array<Question> = [
            {
                message: "Repository URL (Main Project): ",
                name: "main",
                type: "input",
            } as Question,
            {
                message: "Repository url (Common Code): ",
                name: "common",
                type: "input",
            } as Question,
            {
                message: "Common project already exists: ",
                name: "commonExists",
                type: "confirm",
            } as Question];
        return ask<{ main: string; common: string, commonExists: boolean }>(qs).then((answer) => {
            GitGen.commonProjectExists = answer.commonExists;
            return {
                common: answer.common,
                main: answer.main,
            } as IRepositoryConfig;
        });
    }
}
