"use strict";
var fs = require('fs-extra');
var Util_1 = require("../../util/Util");
var CordovaGen = (function () {
    function CordovaGen() {
        this.path = 'cordova.json';
        try {
            this.json = JSON.parse(fs.readFileSync(this.path, { encoding: 'utf8' }));
        }
        catch (e) {
            Util_1.Util.log.error(e.message);
        }
    }
    CordovaGen.prototype.install = function () {
        var plugins = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            plugins[_i - 0] = arguments[_i];
        }
        if (!plugins.length) {
            plugins = this.json.plugins;
        }
        Util_1.Util.run("cordova plugin add " + plugins.join(' '));
    };
    CordovaGen.prototype.uninstall = function () {
        var plugins = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            plugins[_i - 0] = arguments[_i];
        }
        if (!plugins.length) {
            plugins = this.json.plugins;
        }
        Util_1.Util.exec("cordova plugin rm " + plugins.join(' '));
    };
    CordovaGen.getPlugins = function () {
        var serviceNames = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            serviceNames[_i - 0] = arguments[_i];
        }
        var plugins = [];
        for (var i = 0, il = serviceNames.length; i < il; ++i) {
            var pluginName = CordovaGen.serviceMap[serviceNames[i]];
            if (!pluginName)
                continue;
            var pluginsStr = CordovaGen.pluginMap[pluginName];
            var pluginNames = pluginsStr.split(',');
            for (var j = 0, jl = pluginNames.length; j < jl; ++j) {
                if (plugins.indexOf(pluginNames[j]) < 0) {
                    plugins.push(pluginNames[j]);
                }
            }
        }
        return plugins;
    };
    CordovaGen.getInstance = function () {
        if (!CordovaGen.instance) {
            CordovaGen.instance = new CordovaGen();
        }
        return CordovaGen.instance;
    };
    CordovaGen.pluginMap = {
        FilePlugin: 'cordova-plugin-file-transfer,cordova-plugin-file',
        MediaPlugin: 'cordova-plugin-camera, cordova-plugin-media-capture',
        NetworkPlugin: 'cordova-plugin-network-information',
        SharePlugin: 'cordova-plugin-x-socialsharing',
        SplashPlugin: 'cordova-plugin-splashscreen',
        StatusbarPlugin: 'cordova-plugin-statusbar',
        KeyboardPlugin: 'ionic-plugin-keyboard',
        ToastPlugin: 'cordova-plugin-x-toast'
    };
    CordovaGen.serviceMap = {
        FileService: 'FilePlugin',
        MediaService: 'MediaPlugin',
        NetworkService: 'NetworkPlugin',
        ShareService: 'SharePlugin',
        SplashService: 'SplashPlugin'
    };
    return CordovaGen;
}());
exports.CordovaGen = CordovaGen;
