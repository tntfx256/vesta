"use strict";
var fs = require('fs-extra');
var path = require('path');
var _ = require('lodash');
var inquirer = require('inquirer');
var ClassGen_1 = require("../../../core/ClassGen");
var TSFileGen_1 = require("../../../core/TSFileGen");
var Util_1 = require("../../../../util/Util");
var CordovaGen_1 = require("../../../file/CordovaGen");
var Vesta_1 = require("../../../file/Vesta");
var ClientAppGen_1 = require("../../../app/client/ClientAppGen");
var NGDependencyInjector = (function () {
    function NGDependencyInjector() {
    }
    NGDependencyInjector.getServices = function () {
        var fetchPlugins = Vesta_1.Vesta.getInstance().getConfig().client.platform == ClientAppGen_1.ClientAppGen.Platform.Cordova, serviceDirectory = 'src/app/service', services = [];
        try {
            var serviceFiles = fs.readdirSync(serviceDirectory);
            for (var i = 0; i < serviceFiles.length; i++) {
                var serviceFile = serviceFiles[i];
                if (!/\.ts$/.exec(serviceFile))
                    continue;
                var className = serviceFile.substr(0, serviceFile.length - 3);
                services.push({
                    name: className,
                    path: path.join(serviceDirectory, serviceFile),
                    type: className,
                    plugins: fetchPlugins ? CordovaGen_1.CordovaGen.getPlugins(className) : []
                });
            }
        }
        catch (e) {
            console.error(e);
        }
        return services;
    };
    NGDependencyInjector.inject = function (file, injects, destination, ignoreDependencies) {
        if (ignoreDependencies === void 0) { ignoreDependencies = false; }
        var staticInject = '', theClass = file.getClass(file.name), cm = theClass.getConstructor(), injecteds = [], vesta = Vesta_1.Vesta.getInstance(), plugins = [];
        for (var i = 0, il = injects.length; i < il; ++i) {
            if (injecteds.indexOf(injects[i].name) >= 0)
                continue;
            injecteds.push(injects[i].name);
            var instanceName, importPath, injectable = injects[i];
            if (injectable.isLib) {
                instanceName = injectable.name;
                importPath = injectable.path;
            }
            else {
                instanceName = _.camelCase(injectable.name);
                importPath = Util_1.Util.genRelativePath(destination, injectable.path);
            }
            cm.addParameter({ name: instanceName, type: injectable.type, access: ClassGen_1.ClassGen.Access.Private });
            if (importPath) {
                var imp = injectable.importType == TSFileGen_1.TsFileGen.ImportType.Namespace ? injectable.type : "{" + injectable.type + "}";
                file.addImport(imp, importPath, injectable.importType || TSFileGen_1.TsFileGen.ImportType.Module);
            }
            staticInject += (staticInject ? ', ' : '') + ("'" + instanceName + "'");
            if (injectable.plugins && injectable.plugins.length) {
                plugins = plugins.concat(injectable.plugins);
            }
        }
        theClass.addProperty({
            name: '$inject',
            access: ClassGen_1.ClassGen.Access.Public,
            defaultValue: "[" + staticInject + "]",
            isStatic: true
        });
        //if (plugins.length && !ignoreDependencies) {
        //    vesta.cordovaExec(['plugin', 'add'].concat(plugins));
        //}
    };
    NGDependencyInjector.updateImportAndAppFile = function (file, type, destination, placeHolder, importPath) {
        var className = file.name, instanceName = _.camelCase(className), appFilePath = 'src/app/app.ts', importFilePath = 'src/app/config/import.ts';
        if (/.+Filter$/.exec(instanceName)) {
            instanceName = instanceName.replace(/Filter$/, '');
        }
        Util_1.Util.fs.writeFile(path.join(destination, className + '.ts'), file.generate());
        var importFileCode = fs.readFileSync(importFilePath, { encoding: 'utf8' }), importCode = "export {" + className + "} from '" + importPath + "/" + className + "';", appFileCode = fs.readFileSync(appFilePath, { encoding: 'utf8' }), embedCode = "clientApp.module." + type + "('" + instanceName + "', imp." + className + ");\n    " + placeHolder;
        if (appFileCode.indexOf(placeHolder) < 0)
            return;
        if (importFileCode.indexOf(importCode) >= 0)
            return;
        appFileCode = appFileCode.replace(placeHolder, embedCode);
        importFileCode += '\n' + importCode;
        Util_1.Util.fs.writeFile(appFilePath, appFileCode);
        Util_1.Util.fs.writeFile(importFilePath, importFileCode);
    };
    NGDependencyInjector.getCliInjectables = function (extraInjectables) {
        if (extraInjectables === void 0) { extraInjectables = []; }
        var injectables = [{
                name: '$rootScope',
                type: 'IExtRootScopeService',
                path: 'src/app/ClientApp'
            }].concat(extraInjectables, NGDependencyInjector.getServices()), injectableNames = [];
        for (var i = 0, il = injectables.length; i < il; ++i) {
            injectableNames.push(injectables[i].name);
        }
        return new Promise(function (resolve) {
            inquirer.prompt({
                name: 'injects',
                type: 'checkbox',
                message: 'Injectables: ',
                choices: injectableNames
            }, function (answer) {
                var selected = [];
                for (var i = answer['injects'].length; i--;) {
                    for (var j = injectables.length; j--;) {
                        if (answer['injects'][i] == injectables[j].name) {
                            selected.push(injectables[j]);
                        }
                    }
                }
                resolve(selected);
            });
        });
    };
    return NGDependencyInjector;
}());
exports.NGDependencyInjector = NGDependencyInjector;
