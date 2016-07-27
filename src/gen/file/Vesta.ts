import * as fs from "fs-extra";
import {IProjectGenConfig} from "../ProjectGen";
import {IProjectConfig, Config} from "../../Config";
import {FsUtil} from "../../util/FsUtil";
import {Log} from "../../util/Log";
import {CmdUtil} from "../../util/CmdUtil";

export interface IProjectVersion {
    app:string;
    api:string;
}

export interface IVesta {
    version:IProjectVersion;
    config:IProjectGenConfig;
}

export class Vesta {

    private static instance:Vesta;
    private json:IVesta;
    private path = 'vesta.json';
    private isUpdate:boolean = false;
    private static projectConfig:IProjectConfig = Config;

    constructor(private config:IProjectGenConfig = null) {
        if (config) {
            this.json = {
                version: {app: '0.1.0', api: 'v1'},
                config: config
            };
        } else {
            this.isUpdate = true;
            try {
                if (!fs.existsSync(this.path)) {
                    Log.error('`vesta.json` not found. Make sure you are in the correct directory');
                    process.exit();
                }
                this.json = JSON.parse(fs.readFileSync(this.path, {encoding: 'utf8'}));
            } catch (e) {
                Log.error(e);
                process.exit();
            }
        }
    }

    public generate() {
        if (this.isUpdate) {
            Log.error('Invalid operation');
        } else {
            FsUtil.writeFile(`${this.config.name}/vesta.json`, JSON.stringify(this.json, null, 2));
        }
    }

    public static getInstance(config:IProjectGenConfig = null):Vesta {
        if (!Vesta.instance) {
            Vesta.instance = new Vesta(config);
        }
        return Vesta.instance;
    }

    public getConfig():IProjectGenConfig {
        return this.json.config;
    }

    public static updatePackages(args:Array<string>) {
        try {
            let content = JSON.parse(fs.readFileSync(`package.json`, {encoding: 'utf8'}));
            var isDev = args.indexOf('dev') >= 0;
            let pkgKeyName = isDev ? 'devDependencies' : 'dependencies';
            let allPackages = Object.keys(content[pkgKeyName]);
            let pkgs = args.indexOf('all') >= 0 ? allPackages : allPackages.filter(pkg=> pkg.search(/^vesta-/i) >= 0);
            pkgs.forEach(pkg=> delete content[pkgKeyName][pkg]);
            fs.writeFileSync(`package.json`, JSON.stringify(content, null, 2), {encoding: 'utf8'});
            CmdUtil.execSync(`npm install --save${isDev ? '-dev' : ''} ${pkgs.join(' ')}`);
        } catch (err) {
            console.log(err);
        }
    }

    public getProjectConfig():IProjectConfig {
        return Vesta.projectConfig;
    }

    public getVersion() {
        return this.json.version;
    }
}
