import * as fs from 'fs-extra';
import {ProjectGen} from "../ProjectGen";
import {Vesta} from "../file/Vesta";
import {Util} from "../../util/Util";

export interface ICordova {
    plugins: Array<string>;
    platforms: Array<string>;
}

export class CordovaGen {

    private path = 'cordova.json';
    private json:ICordova;
    private static instance:CordovaGen;
    private static pluginMap = {
        FilePlugin: 'cordova-plugin-file-transfer,cordova-plugin-file',
        MediaPlugin: 'cordova-plugin-camera, cordova-plugin-media-capture',//(cordova-plugin-media/cordova-plugin-media-with-compression-fork)
        NetworkPlugin: 'cordova-plugin-network-information',
        SharePlugin: 'cordova-plugin-x-socialsharing',
        SplashPlugin: 'cordova-plugin-splashscreen',
        StatusbarPlugin: 'cordova-plugin-statusbar',
        KeyboardPlugin: 'ionic-plugin-keyboard',
        ToastPlugin: 'cordova-plugin-x-toast'
    };
    private static serviceMap = {
        FileService: 'FilePlugin',
        MediaService: 'MediaPlugin',
        NetworkService: 'NetworkPlugin',
        ShareService: 'SharePlugin',
        SplashService: 'SplashPlugin'
    };

    constructor() {
        try {
            this.json = JSON.parse(fs.readFileSync(this.path, {encoding: 'utf8'}))
        } catch (e) {
            Util.log.error(e.message);
        }
    }

    public install(...plugins:Array<string>) {
        if (!plugins.length) {
            plugins = this.json.plugins;
        }
        Util.run(`cordova plugin add ${plugins.join(' ')}`);
    }

    public uninstall(...plugins:Array<string>) {
        if (!plugins.length) {
            plugins = this.json.plugins;
        }
        Util.exec(`cordova plugin rm ${plugins.join(' ')}`);
    }

    public static getPlugins(...serviceNames:Array<string>):Array<string> {
        var plugins = [];
        for (var i = 0, il = serviceNames.length; i < il; ++i) {
            var pluginName = CordovaGen.serviceMap[serviceNames[i]];
            if (!pluginName) continue;
            var pluginsStr:string = CordovaGen.pluginMap[pluginName];
            var pluginNames = pluginsStr.split(',');
            for (var j = 0, jl = pluginNames.length; j < jl; ++j) {
                if (plugins.indexOf(pluginNames[j]) < 0) {
                    plugins.push(pluginNames[j]);
                }
            }
        }
        return plugins;
    }

    public static getInstance():CordovaGen {
        if (!CordovaGen.instance) {
            CordovaGen.instance = new CordovaGen();
        }
        return CordovaGen.instance;
    }
}
