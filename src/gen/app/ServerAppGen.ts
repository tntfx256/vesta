import * as inqurer from "inquirer";
import {Question} from "inquirer";
import {IFileGenerator} from "../core/IFileGenerator";
import {Vesta} from "../file/Vesta";
import {DatabaseGen} from "../core/DatabaseGen";
import {IProjectGenConfig} from "../ProjectGen";
import {ExpressAppGen} from "./server/ExpressAppGen";
import {GitGen} from "../file/GitGen";
import {Util} from "../../util/Util";
var speakeasy = require('speakeasy');

export interface IServerAppConfig {
    type:string;
    database:string;
}

export class ServerAppGen implements IFileGenerator {
    private express:ExpressAppGen;
    private vesta:Vesta;

    constructor(private config:IProjectGenConfig) {
        this.vesta = Vesta.getInstance();
        this.express = new ExpressAppGen(config);
    }

    private getBranchName():string {
        // var branch = 'master';
        // if (this.config.server.database != DatabaseGen.None) {
        //     branch += `-${this.config.server.database}`;
        // }
        return 'master';
    }

    private cloneTemplate():Promise<any> {
        var dir = this.config.name,
            repo = this.vesta.getProjectConfig().repository;
        return GitGen.clone(`${repo.baseRepoUrl}/${repo.group}/${repo.express}.git`, dir, this.getBranchName())
            .then(()=>GitGen.cleanClonedRepo(dir))
            .then(()=>Util.fs.copy(`${dir}/resources/gitignore/src/config/setting.var.ts`, `${dir}/src/config/setting.var.ts`))
    }

    public generate():Promise<any> {
        return this.cloneTemplate();
    }

    static getGeneratorConfig():Promise<IServerAppConfig> {
        var config:IServerAppConfig = <IServerAppConfig>{type: 'express'};
        return new Promise<IServerAppConfig>(resolve=> {
            var question = <Question>{
                type: 'list',
                name: 'database',
                message: 'Database: ',
                choices: [DatabaseGen.None, DatabaseGen.Mongodb, DatabaseGen.MySQL],
                default: DatabaseGen.None
            };
            inqurer.prompt(question, answer=> {
                config.database = answer['database'];
                resolve(config);
            });
        });
    }
}
