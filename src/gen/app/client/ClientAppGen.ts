import * as inquirer from "inquirer";
import {Question} from "inquirer";
import {Vesta} from "../../file/Vesta";
import {IProjectGenConfig} from "../../ProjectGen";
import {Util} from "../../../util/Util";
import {GitGen} from "../../file/GitGen";

export interface IClientAppConfig {
    platform:string;
    type:string;
    framework:string;
}

export abstract class ClientAppGen {

    static Type = {Angular: 'angular', Angular2: 'angular2'};
    static Platform = {Browser: 'browser', Cordova: 'cordova'};
    static Framework = {Material: 'material', Ionic: 'ionic'};

    protected isCordova:boolean;
    protected vesta:Vesta;

    constructor(protected config:IProjectGenConfig) {
        this.isCordova = config.client.platform == ClientAppGen.Platform.Cordova;
        this.vesta = Vesta.getInstance(config);
    }

    private getRepoName():string {
        var name = '',
            repo = this.vesta.getProjectConfig().repository;
        if (this.config.client.platform == ClientAppGen.Platform.Cordova) {
            name = repo.ionic;
        } else {
            name = repo.material;
        }
        return name;
    }

    private cloneTemplate():Promise<any> {
        var dir = this.config.name,
            repo = this.vesta.getProjectConfig().repository;
        return GitGen.clone(`${repo.baseRepoUrl}/${repo.group}/${this.getRepoName()}.git`, dir)
            .then(()=>GitGen.cleanClonedRepo(dir));
    }

    public generate():Promise<any> {
        return this.cloneTemplate()
            .then(()=> {
                var dir = this.config.name,
                    templateProjectName = this.getRepoName(),
                    replacePattern = {};
                replacePattern[templateProjectName] = dir;
                Util.findInFileAndReplace(`${dir}/src/app/config/setting.ts`, replacePattern);
                Util.findInFileAndReplace(`${dir}/resources/gitignore/src/app/config/setting.var.ts`, {
                    'http://localhost:3000': this.config.endpoint
                });
                Util.fs.copy(`${dir}/resources/gitignore/src/app/config/setting.var.ts`, `${dir}/src/app/config/setting.var.ts`);
                if (this.isCordova) {
                    Util.fs.mkdir(`${dir}/www`); // for installing plugins this folder must exist
                    Util.findInFileAndReplace(dir + '/config.xml', replacePattern);
                }
            })
    }

    public static getGeneratorConfig():Promise<IClientAppConfig> {
        var qs:Array<Question> = [
                <Question>{
                    type: 'list',
                    name: 'platform',
                    message: 'Platform: ',
                    choices: [ClientAppGen.Platform.Browser, ClientAppGen.Platform.Cordova],
                    default: ClientAppGen.Platform.Browser
                },
                <Question>{
                    type: 'list',
                    name: 'type',
                    message: 'Client Side Type: ',
                    choices: [ClientAppGen.Type.Angular/*, ClientAppGen.Type.Angular2*/],
                    default: ClientAppGen.Type.Angular
                },
                <Question>{
                    type: 'list',
                    name: 'framework',
                    message: 'Framework: ',
                    choices: [ClientAppGen.Framework.Material, ClientAppGen.Framework.Ionic],
                    default: ClientAppGen.Framework.Material
                }],
            config:IClientAppConfig = <IClientAppConfig>{};
        return new Promise<IClientAppConfig>((resolve)=> {
            inquirer.prompt(qs, answer=> {
                config.platform = answer['platform'];
                config.type = answer['type'];
                config.framework = answer['framework'];
                resolve(config);
            });
        });
    }
}
