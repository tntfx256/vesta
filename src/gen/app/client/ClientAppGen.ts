import * as inquirer from "inquirer";
import {Question} from "inquirer";
import {Vesta} from "../../file/Vesta";
import {IProjectGenConfig} from "../../ProjectGen";
import {Util} from "../../../util/Util";
import {GitGen} from "../../file/GitGen";
import {FsUtil} from "../../../util/FsUtil";
import {Log} from "../../../util/Log";

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

    private cloneTemplate() {
        var dir = this.config.name,
            repo = this.vesta.getProjectConfig().repository;
        GitGen.clone(GitGen.getRepoUrl(repo.baseUrl, repo.group, this.getRepoName()), dir);
        GitGen.cleanClonedRepo(dir);
    }

    public generate() {
        this.cloneTemplate();
        var dir = this.config.name,
            templateProjectName = this.getRepoName(),
            replacePattern = {};
        replacePattern[templateProjectName] = dir;
        Util.findInFileAndReplace(`${dir}/src/app/config/setting.ts`, replacePattern);
        Util.findInFileAndReplace(`${dir}/resources/gitignore/src/app/config/setting.var.ts`, {
            'http://localhost:3000': this.config.endpoint
        });
        Util.findInFileAndReplace(`${dir}/resources/gitignore/resources/gulp/setting.js`, {
            'http://localhost': /(https?:\/\/[^:]+).*/.exec(this.config.endpoint)[1]
        });
        FsUtil.copy(`${dir}/resources/gitignore/resources/gulp/setting.js`, `${dir}/resources/gulp/setting.js`);
        FsUtil.copy(`${dir}/resources/gitignore/src/app/config/setting.var.ts`, `${dir}/src/app/config/setting.var.ts`);
        if (this.isCordova) {
            FsUtil.mkdir(`${dir}/www`); // for installing plugins this folder must exist
            Util.findInFileAndReplace(dir + '/config.xml', replacePattern);
        }
    }

    public static getGeneratorConfig():Promise<IClientAppConfig> {
        var config:IClientAppConfig = <IClientAppConfig>{};
        var qs:Array<Question> = [
            <Question>{
                type: 'list',
                name: 'platform',
                message: 'Platform: ',
                choices: [ClientAppGen.Platform.Browser, ClientAppGen.Platform.Cordova]
            }];
        Log.info(`For browser platform we use Material Design, and on Cordova we use Ionic (both on Angular 1.x)`);
        return new Promise<IClientAppConfig>((resolve)=> {
            inquirer.prompt(qs, answer=> {
                config.type = ClientAppGen.Type.Angular;
                config.platform = answer['platform'];
                config.framework = config.platform == ClientAppGen.Platform.Browser ? ClientAppGen.Framework.Material : ClientAppGen.Framework.Ionic;
                resolve(config);
            });
        });
    }
}
