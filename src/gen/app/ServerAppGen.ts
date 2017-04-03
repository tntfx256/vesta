import {Question} from "inquirer";
import {Vesta} from "../file/Vesta";
import {DatabaseGen} from "../core/DatabaseGen";
import {IProjectConfig} from "../ProjectGen";
import {GitGen} from "../file/GitGen";
import {Util} from "../../util/Util";
import {GenConfig} from "../../Config";

export interface IServerAppConfig {
    type: string;
    database: string;
}

export class ServerAppGen {
    private vesta: Vesta;

    constructor(private config: IProjectConfig) {
        this.vesta = Vesta.getInstance();
    }

    private getBranchName(): string {
        // let branch = 'master';
        // if (this.config.server.database != DatabaseGen.None) {
        //     branch += `-${this.config.server.database}`;
        // }
        return 'master';
    }

    private cloneTemplate() {
        let dir = this.config.name,
            repo = GenConfig.repository;
        GitGen.clone(GitGen.getRepoUrl(repo.baseUrl, repo.group, repo.express), dir, this.getBranchName());
        GitGen.cleanClonedRepo(dir);
        // server app no longer contains variant settings
        // FsUtil.copy(`${dir}/resources/gitignore/src/config/setting.var.ts`, `${dir}/src/config/setting.var.ts`);
    }

    public generate() {
        return this.cloneTemplate();
    }

    static getGeneratorConfig(): Promise<IServerAppConfig> {
        let config: IServerAppConfig = <IServerAppConfig>{type: 'express'};
        return new Promise<IServerAppConfig>(resolve => {
            let question = <Question>{
                type: 'list',
                name: 'database',
                message: 'Database: ',
                choices: [DatabaseGen.MySQL, DatabaseGen.Mongodb],
                default: DatabaseGen.MySQL
            };
            Util.prompt<{ database: string }>(question).then(answer => {
                config.database = answer.database;
                resolve(config);
            });
        });
    }
}
