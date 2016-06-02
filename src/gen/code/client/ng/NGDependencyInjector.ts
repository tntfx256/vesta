import * as fs from "fs-extra";
import * as path from "path";
import * as _ from "lodash";
import {Question} from "inquirer";
import {ClassGen} from "../../../core/ClassGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {Util} from "../../../../util/Util";
import {CordovaGen} from "../../../file/CordovaGen";
import {Vesta} from "../../../file/Vesta";
import {ClientAppGen} from "../../../app/client/ClientAppGen";
import {FsUtil} from "../../../../util/FsUtil";


export interface INGInjectable {
    name?:string;
    type?:string;
    path?:string;
    isLib?:boolean;
    importType?:number;
    plugins?:Array<string>;
}

export class NGDependencyInjector {

    public static getServices():Array<INGInjectable> {
        var fetchPlugins = Vesta.getInstance().getConfig().client.platform == ClientAppGen.Platform.Cordova,
            serviceDirectory = 'src/app/service',
            services:Array<INGInjectable> = [];
        try {
            var serviceFiles = fs.readdirSync(serviceDirectory);
            for (var i = 0; i < serviceFiles.length; i++) {
                var serviceFile = serviceFiles[i];
                if (!/\.ts$/.exec(serviceFile)) continue;
                var className = serviceFile.substr(0, serviceFile.length - 3);
                services.push({
                    name: className,
                    path: path.join(serviceDirectory, serviceFile),
                    type: className,
                    plugins: fetchPlugins ? CordovaGen.getPlugins(className) : []
                });
            }
        } catch (e) {
            console.error(e);
        }
        return services;
    }

    public static inject(file:TsFileGen, injects:Array<INGInjectable>, destination:string, ignoreDependencies:boolean = false) {
        var staticInject = '',
            theClass = file.getClass(file.name),
            cm = theClass.getConstructor(),
            injecteds = [],
            vesta = Vesta.getInstance(),
            plugins = [];
        for (var i = 0, il = injects.length; i < il; ++i) {
            if (injecteds.indexOf(injects[i].name) >= 0) continue;
            injecteds.push(injects[i].name);
            var instanceName, importPath, injectable = injects[i];
            if (injectable.isLib) {
                instanceName = injectable.name;
                importPath = injectable.path;
            } else {
                instanceName = _.camelCase(injectable.name);
                importPath = Util.genRelativePath(destination, injectable.path);
            }
            cm.addParameter({name: instanceName, type: injectable.type, access: ClassGen.Access.Private});
            if (importPath) {
                let imp = injectable.importType == TsFileGen.ImportType.Namespace ? injectable.type : `{${injectable.type}}`;
                file.addImport(imp, importPath, injectable.importType || TsFileGen.ImportType.Module);
            }
            staticInject += (staticInject ? ', ' : '' ) + `'${instanceName}'`;
            if (injectable.plugins && injectable.plugins.length) {
                plugins = plugins.concat(injectable.plugins);
            }
        }
        theClass.addProperty({
            name: '$inject',
            access: ClassGen.Access.Public,
            defaultValue: `[${staticInject}]`,
            isStatic: true
        });
        //if (plugins.length && !ignoreDependencies) {
        //    vesta.cordovaExec(['plugin', 'add'].concat(plugins));
        //}
    }

    public static updateImportAndAppFile(file:TsFileGen, type:string, destination:string, placeHolder:string, importPath:string) {
        var className = file.name,
            instanceName = _.camelCase(className),
            importFilePath = 'src/app/config/import.ts';
        if (/.+Filter$/.exec(instanceName)) {
            instanceName = instanceName.replace(/Filter$/, '');
        }
        // creating the ts file and write it's content
        FsUtil.writeFile(path.join(destination, className + '.ts'), file.generate());

        var importFileCode = fs.readFileSync(importFilePath, {encoding: 'utf8'}),
        // import statement code
            importCode = `import {${className}} from '${importPath}/${className}';`,
        // adding module as property to exporter variable code
            embedCode = `,\n        ${instanceName} = ${className}\n${placeHolder}`;

        if (importFileCode.indexOf(importCode) >= 0) return;

        importFileCode = importFileCode.replace('///<vesta:import/>', `${importCode}\n///<vesta:import/>`);
        importFileCode = importFileCode.replace(placeHolder, embedCode);

        FsUtil.writeFile(importFilePath, importFileCode);
    }

    public static getCliInjectables(extraInjectables:Array<INGInjectable> = []):Promise<Array<INGInjectable>> {
        var injectables:Array<INGInjectable> = [<INGInjectable>{
                name: '$rootScope',
                type: 'IExtRootScopeService',
                path: 'src/app/ClientApp'
            }].concat(extraInjectables, NGDependencyInjector.getServices()),
            injectableNames = [];
        for (var i = 0, il = injectables.length; i < il; ++i) {
            injectableNames.push(injectables[i].name);
        }
        return new Promise(resolve=> {
            Util.prompt<{injects:Array<string>}>(<Question>{
                name: 'injects',
                type: 'checkbox',
                message: 'Injectables: ',
                choices: injectableNames
            }).then(answer=> {
                var selected:Array<INGInjectable> = [];
                for (var i = answer['injects'].length; i--;) {
                    for (var j = injectables.length; j--;) {
                        if (answer['injects'][i] == injectables[j].name) {
                            selected.push(injectables[j]);
                        }
                    }
                }
                resolve(selected);
            });
        })
    }
}
