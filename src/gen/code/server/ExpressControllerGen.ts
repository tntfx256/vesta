import * as fs from "fs-extra";
import * as path from "path";
import * as _ from "lodash";
import * as inquirer from "inquirer";
import {Question} from "inquirer";
import {ClassGen} from "../../core/ClassGen";
import {TsFileGen} from "../../core/TSFileGen";
import {MethodGen} from "../../core/MethodGen";
import {Vesta} from "../../file/Vesta";
import {Util} from "../../../util/Util";
import {DatabaseCodeGen} from "./DatabaseCodeGen";
import {Placeholder} from "../../core/Placeholder";
import {ModelGen} from "../ModelGen";
import {FsUtil} from "../../../util/FsUtil";
import {Log} from "../../../util/Log";

export interface IExpressControllerConfig {
    route:string;
    name:string;
    model:string;
}

export class ExpressControllerGen {
    private controllerClass:ClassGen;
    private controllerFile:TsFileGen;
    private rawName:string;
    private routeMethod:MethodGen;
    private path:string = 'src/api';
    private routingPath:string = '/';
    private vesta:Vesta;
    private apiVersion:string;

    constructor(private config:IExpressControllerConfig) {
        this.vesta = Vesta.getInstance();
        this.init(this.vesta.getVersion().api);
    }

    private init(version:string) {
        if (!version) {
            return Log.error('Unable to obtain the API version!');
        }
        this.apiVersion = version;
        this.path = path.join(this.path, version, 'controller', this.config.route);
        this.rawName = _.camelCase(this.config.name);
        var controllerName = _.capitalize(this.rawName) + 'Controller';
        this.normalizeRoutingPath();
        this.controllerFile = new TsFileGen(controllerName);
        this.controllerClass = this.controllerFile.addClass();
        this.controllerFile.addImport('{Request, Response, Router}', 'express');
        this.controllerFile.addImport('{BaseController}', Util.genRelativePath(this.path, 'src/api/BaseController'));
        this.controllerClass.setParentClass('BaseController');
        this.routeMethod = this.controllerClass.addMethod('route');
        this.routeMethod.addParameter({name: 'router', type: 'Router'});
        this.controllerClass.addMethod('init', ClassGen.Access.Protected);
        try {
            fs.mkdirpSync(this.path);
        } catch (e) {
        }
    }

    private addResponseMethod(name:string) {
        var method = this.controllerClass.addMethod(name);
        method.addParameter({name: 'req', type: 'Request'});
        method.addParameter({name: 'res', type: 'Response'});
        method.addParameter({name: 'next', type: 'Function'});
        method.setContent(`return next({message: '${name} has not been implemented'})`);
        return method;
    }

    private addCRUDOperations() {
        var modelInstanceName = _.camelCase(this.config.model),
            modelClassName = _.capitalize(modelInstanceName),
            dbCodeGen:DatabaseCodeGen = new DatabaseCodeGen(modelClassName);
        this.controllerFile.addImport(`{Err}`, Util.genRelativePath(this.path, `src/cmn/Err`));
        this.controllerFile.addImport(`{DatabaseError}`, Util.genRelativePath(this.path, `src/cmn/error/DatabaseError`));
        this.controllerFile.addImport(`{ValidationError}`, Util.genRelativePath(this.path, `src/cmn/error/ValidationError`));
        this.controllerFile.addImport(`{${modelClassName}, I${modelClassName}}`, Util.genRelativePath(this.path, `src/cmn/models/${modelClassName}`));
        this.controllerFile.addImport(`{IQueryResult, IUpsertResult, IDeleteResult}`, Util.genRelativePath(this.path, `src/cmn/ICRUDResult`));
        var middleWares = ` this.acl('__ACL__'),`,
            acl = this.routingPath.replace(/\/+/g, '.');
        //
        var methodName = 'get' + modelClassName,
            methodBasedMiddleWares = middleWares.replace('__ACL__', acl + '.getAll');
        this.addResponseMethod(methodName).setContent(dbCodeGen.getQueryCode(true));
        this.routeMethod.appendContent(`router.get('${this.routingPath}/:id',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        //
        methodName = 'get' + Util.plural(modelClassName);
        methodBasedMiddleWares = middleWares.replace('__ACL__', acl + '.get');
        this.addResponseMethod(methodName).setContent(dbCodeGen.getQueryCode(false));
        this.routeMethod.appendContent(`router.get('${this.routingPath}',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        //
        methodName = 'add' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACL__', acl + '.add');
        this.addResponseMethod(methodName).setContent(dbCodeGen.getInsertCode());
        this.routeMethod.appendContent(`router.post('${this.routingPath}',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        //
        methodName = 'update' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACL__', acl + '.update');
        this.addResponseMethod(methodName).setContent(dbCodeGen.getUpdateCode());
        this.routeMethod.appendContent(`router.put('${this.routingPath}',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        //
        methodName = 'remove' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACL__', acl + '.delete');
        this.addResponseMethod(methodName).setContent(dbCodeGen.getDeleteCode());
        this.routeMethod.appendContent(`router.delete('${this.routingPath}',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
    }

    public generate() {
        if (this.config.model) {
            this.addCRUDOperations();
        }
        FsUtil.writeFile(path.join(this.path, this.controllerClass.name + '.ts'), this.controllerFile.generate());
        var filePath = 'src/api/ApiFactory.ts';
        var code = fs.readFileSync(filePath, {encoding: 'utf8'});
        if (code.search(Placeholder.Router)) {
            var relPath = Util.genRelativePath('src/api', this.path);
            var importCode = `import {${this.controllerClass.name}} from '${relPath}/${this.controllerClass.name}';`;
            if (code.indexOf(importCode) >= 0) return;
            var controllerCamel = _.camelCase(this.controllerClass.name);
            var embedCode = `var ${controllerCamel} = new ${this.controllerClass.name}(setting, database);
        ${controllerCamel}.route(router);
        ${Placeholder.Router}`;
            code = importCode + '\n' + code.replace(Placeholder.Router, embedCode);
            FsUtil.writeFile(filePath, code);
        }
    }

    private normalizeRoutingPath():void {
        var edge = _.camelCase(this.config.name);
        this.routingPath = `${this.config.route}`;
        if (this.routingPath.charAt(0) != '/') this.routingPath = `/${this.routingPath}`;
        this.routingPath += `/${edge}`;
        this.routingPath = this.routingPath.replace(/\/{2,}/g, '/');
    }

    public static getGeneratorConfig(name:string, callback) {
        var config:IExpressControllerConfig = <IExpressControllerConfig>{},
            models = Object.keys(ModelGen.getModelsList());
        models.unshift('None');
        var q:Array<Question> = [
            <Question>{
                name: 'routingPath',
                type: 'input',
                message: 'Routing Path: ',
                choices: models,
                default: '/'
            },
            <Question>{
                name: 'model',
                type: 'list',
                message: 'Model for CRUD: ',
                choices: models,
                default: 'None'
            }];
        config.name = name;
        inquirer.prompt(q, answer => {
            var modelName = answer['model'];
            if (modelName != 'None') {
                config.model = modelName;
            }
            config.route = answer['routingPath'];
            callback(config);
        });
    }

}
