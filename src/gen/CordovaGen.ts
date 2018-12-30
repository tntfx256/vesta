import * as fs from "fs-extra";
import { execute } from "../util/CmdUtil";
import { Log } from "../util/Log";

export interface ICordova {
    plugins: string[];
    platforms: string[];
}

export class CordovaGen {

    public static getPlugins(...serviceNames: string[]): string[] {
        const plugins = [];
        for (let i = 0, il = serviceNames.length; i < il; ++i) {
            const pluginName = CordovaGen.serviceMap[serviceNames[i]];
            if (!pluginName) { continue; }
            const pluginsStr: string = CordovaGen.pluginMap[pluginName];
            const pluginNames = pluginsStr.split(",");
            for (let j = 0, jl = pluginNames.length; j < jl; ++j) {
                if (plugins.indexOf(pluginNames[j]) < 0) {
                    plugins.push(pluginNames[j]);
                }
            }
        }
        return plugins;
    }

    public static getInstance(): CordovaGen {
        if (!CordovaGen.instance) {
            CordovaGen.instance = new CordovaGen();
        }
        return CordovaGen.instance;
    }
    private static instance: CordovaGen;
    private static pluginMap = {
        FilePlugin: "cordova-plugin-file-transfer,cordova-plugin-file",
        KeyboardPlugin: "ionic-plugin-keyboard",
        MediaPlugin: "cordova-plugin-camera, cordova-plugin-media-capture", // (cordova-plugin-media/cordova-plugin-media-with-compression-fork)
        NetworkPlugin: "cordova-plugin-network-information",
        SharePlugin: "cordova-plugin-x-socialsharing",
        SplashPlugin: "cordova-plugin-splashscreen",
        StatusbarPlugin: "cordova-plugin-statusbar",
        ToastPlugin: "cordova-plugin-x-toast",
    };
    private static serviceMap = {
        FileService: "FilePlugin",
        MediaService: "MediaPlugin",
        NetworkService: "NetworkPlugin",
        ShareService: "SharePlugin",
        SplashService: "SplashPlugin",
    };

    private path = "cordova.json";
    private json: ICordova;

    constructor() {
        try {
            this.json = JSON.parse(fs.readFileSync(this.path, { encoding: "utf8" }));
        } catch (e) {
            Log.error(e.message);
        }
    }

    public install(...plugins: string[]) {
        if (!plugins.length) {
            plugins = this.json.plugins;
        }
        execute(`cordova plugin add ${plugins.join(" ")}`);
    }

    public uninstall(...plugins: string[]) {
        if (!plugins.length) {
            plugins = this.json.plugins;
        }
        execute(`cordova plugin rm ${plugins.join(" ")}`);
    }
}
