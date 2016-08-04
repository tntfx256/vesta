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
import {Placeholder} from "../../core/Placeholder";
import {ModelGen} from "../ModelGen";
import {FsUtil} from "../../../util/FsUtil";
import {Log} from "../../../util/Log";
import {IModelFields} from "vesta-schema/Model";
import {FieldType} from "vesta-schema/Field";

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
    private filesFields:IModelFields = null;
    private relationsFields:IModelFields = null;

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
        let controllerName = _.capitalize(this.rawName) + 'Controller';
        this.normalizeRoutingPath();
        this.controllerFile = new TsFileGen(controllerName);
        this.controllerClass = this.controllerFile.addClass();
        this.filesFields = ModelGen.getFieldsByType(this.config.model, FieldType.File);
        if (this.filesFields) {
            this.controllerFile.addImport('* as path', 'path');
        }
        this.controllerFile.addImport('{Response, Router}', 'express');
        this.controllerFile.addImport('{BaseController, IExtRequest}', Util.genRelativePath(this.path, 'src/api/BaseController'));
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
        let method = this.controllerClass.addMethod(name);
        method.addParameter({name: 'req', type: 'IExtRequest'});
        method.addParameter({name: 'res', type: 'Response'});
        // method.addParameter({name: 'next', type: 'Function'});
        method.setContent(`return next({message: '${name} has not been implemented'})`);
        return method;
    }

    private addCRUDOperations() {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = _.camelCase(modelName),
            modelClassName = _.capitalize(modelInstanceName);
        this.relationsFields = ModelGen.getFieldsByType(this.config.model, FieldType.Relation);
        this.controllerFile.addImport(`{Err}`, 'vesta-util/Err');
        // this.controllerFile.addImport(`{DatabaseError}`, 'vesta-schema/error/DatabaseError');
        this.controllerFile.addImport(`{ValidationError}`, 'vesta-schema/error/ValidationError');
        this.controllerFile.addImport(`{${modelClassName}, I${modelClassName}}`, Util.genRelativePath(this.path, `src/cmn/models/${this.config.model}`));
        this.controllerFile.addImport(`{IUpsertResult}`, 'vesta-schema/ICRUDResult');
        this.controllerFile.addImport(`{Vql}`, 'vesta-schema/Vql');
        let acl = this.routingPath.replace(/\/+/g, '.');
        acl = acl[0] == '.' ? acl.slice(1) : acl;
        let middleWares = ` this.checkAcl('${acl}', '__ACTION__'),`;
        //
        let methodName = 'get' + modelClassName,
            methodBasedMiddleWares = middleWares.replace('__ACTION__', 'read');
        this.addResponseMethod(methodName).setContent(this.getQueryCode(true));
        this.routeMethod.appendContent(`router.get('${this.routingPath}/:id',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        //
        methodName = 'get' + Util.plural(modelClassName);
        this.addResponseMethod(methodName).setContent(this.getQueryCode(false));
        this.routeMethod.appendContent(`router.get('${this.routingPath}',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        //
        methodName = 'add' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACTION__', 'create');
        this.addResponseMethod(methodName).setContent(this.getInsertCode());
        this.routeMethod.appendContent(`router.post('${this.routingPath}',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        //
        methodName = 'update' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACTION__', 'update');
        this.addResponseMethod(methodName).setContent(this.getUpdateCode());
        this.routeMethod.appendContent(`router.put('${this.routingPath}',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        //
        methodName = 'remove' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACTION__', 'delete');
        this.addResponseMethod(methodName).setContent(this.getDeleteCode());
        this.routeMethod.appendContent(`router.delete('${this.routingPath}',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        // file upload
        if (this.filesFields) {
            methodName = 'upload';
            methodBasedMiddleWares = middleWares.replace('__ACTION__', 'update');
            this.addResponseMethod(methodName).setContent(this.getUploadCode());
            this.routeMethod.appendContent(`router.post('${this.routingPath}/file/:id',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        }
    }

    public generate() {
        if (this.config.model) {
            this.addCRUDOperations();
        }
        FsUtil.writeFile(path.join(this.path, this.controllerClass.name + '.ts'), this.controllerFile.generate());
        let apiVersion = this.vesta.getVersion().api;
        let filePath = `src/api/${apiVersion}/import.ts`;
        let code = fs.readFileSync(filePath, {encoding: 'utf8'});
        if (code.search(Placeholder.ExpressController)) {
            let relPath = Util.genRelativePath(`src/api/${apiVersion}`, this.path);
            let importCode = `import {${this.controllerClass.name}} from '${relPath}/${this.controllerClass.name}';`;
            if (code.indexOf(importCode) >= 0) return;
            let embedCode = `${_.camelCase(this.config.name)}: ${this.controllerClass.name},`;
            code = code.replace(Placeholder.Import, `${importCode}\n${Placeholder.Import}`);
            code = code.replace(Placeholder.ExpressController, `${embedCode}\n\t\t${Placeholder.ExpressController}`);
            FsUtil.writeFile(filePath, code);
        }
    }

    private normalizeRoutingPath():void {
        let edge = _.camelCase(this.config.name);
        this.routingPath = `${this.config.route}`;
        if (this.routingPath.charAt(0) != '/') this.routingPath = `/${this.routingPath}`;
        this.routingPath += `/${edge}`;
        this.routingPath = this.routingPath.replace(/\/{2,}/g, '/');
    }

    private getQueryCodeForSingleInstance():string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let code = '';
        if (this.relationsFields) {
            let fieldsTofetch = Object.keys(this.relationsFields);
            code = `let query = new Vql(${modelName}.schema.name);
        query.filter({id: req.params.id}).fetchRecordFor('${fieldsTofetch.join("', '")}');
        ${modelName}.findByQuery<I${modelName}>(query)`;
        } else {
            code = `${modelName}.findById<I${modelName}>(req.params.id)`
        }
        return `${code}
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBQuery, reason.error.message));`;
    }

    private getQueryCodeForMultiInstance():string {
        let modelName = ModelGen.extractModelName(this.config.model);
        return `let query = new Vql(${modelName}.schema.name);
        query.filter(req.query.query).limitTo(Math.min(+req.query.limit || 50, 50)).fromPage(+req.query.page || 1);
        ${modelName}.findByQuery(query)
            .then(result=>res.json(result))
            .catch(reason=>this.handleError(res, Err.Code.DBQuery, reason.error.message));`;
    }

    private getQueryCode(isSingle:boolean):string {
        return isSingle ? this.getQueryCodeForSingleInstance() : this.getQueryCodeForMultiInstance();
    }

    private getInsertCode():string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = _.camelCase(modelName);
        return `let ${modelInstanceName} = new ${modelName}(req.body),
            validationError = ${modelInstanceName}.validate();
        if (validationError) {
            let result:IUpsertResult<I${modelName}> = <IUpsertResult<I${modelName}>>{};
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        ${modelInstanceName}.insert<I${modelName}>()
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBInsert, reason.error.message));`;
    }

    private getUpdateCode():string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = _.camelCase(modelName);
        return `let ${modelInstanceName} = new ${modelName}(req.body),
            validationError = ${modelInstanceName}.validate();
        if (validationError) {
            let result:IUpsertResult<I${modelName}> = <IUpsertResult<I${modelName}>>{};
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        ${modelName}.findById<I${modelName}>(${modelInstanceName}.id)
            .then(result=> {
                if (result.items.length == 1) return ${modelInstanceName}.update<I${modelName}>().then(result=>res.json(result));
                this.handleError(res, Err.Code.DBUpdate);
            })
            .catch(reason=> this.handleError(res, Err.Code.DBUpdate, reason.error.message));`;
    }

    private getDeleteCode():string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = _.camelCase(modelName);
        return `let ${modelInstanceName} = new ${modelName}({id: req.body.id});
        ${modelInstanceName}.delete()
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBDelete, reason.error.message));`;
    }

    private getUploadCode():string {
        this.controllerFile.addImport('{FileUploader}', Util.genRelativePath(this.path, 'src/helpers/FileUploader'));
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = _.camelCase(modelName);
        let code = '';
        let fileNames = Object.keys(this.filesFields);
        if (fileNames.length == 1) {
            code = `let oldFileName = ${modelInstanceName}.image;
                ${modelInstanceName}.image = upl.${fileNames[0]};
                return this.checkAndDeleteFile(\`\${destDirectory}/\${oldFileName}\`);`;
        } else {
            code = `let delList:Array<Promise<string>> = [];`;
            for (let i = 0, il = fileNames.length; i < il; ++i) {
                let oldName = `old${_.capitalize(fileNames[i])}`;
                code += `
                if (upl.${fileNames[i]}) {
                    let ${oldName} = ${modelInstanceName}.${fileNames[i]};
                    delList.push(this.checkAndDeleteFile(\`\${destDirectory}/\${${oldName}}\`)
                        .then(()=> ${modelInstanceName}.${fileNames[i]} = upl.${fileNames[i]}));
                }`
            }
            code += `
                return Promise.all(delList);`;
        }
        return `let ${modelInstanceName}:${modelName};
        let destDirectory = path.join(this.setting.dir.upload, '${modelInstanceName}');
        ${modelName}.findById<I${modelName}>(+req.params.id)
            .then(result=> {
                if (result.error) throw result.error;
                if (result.items.length != 1) throw new Err(Err.Code.DBQuery, '${modelName} not found');
                ${modelInstanceName} = new ${modelName}(result.items[0]);
                let uploader = new FileUploader<I${modelName}>(destDirectory);
                return uploader.upload(req);
            })
            .then(upl=> {
                ${code}
            })
            .then(()=> ${modelInstanceName}.update())
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, reason.error.code, reason.error.message));`;
    }

    public static getGeneratorConfig(name:string, callback) {
        let config:IExpressControllerConfig = <IExpressControllerConfig>{},
            models = Object.keys(ModelGen.getModelsList());
        models.unshift('None');
        if (name) {
            let q:Array<Question> = [
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
                let modelName = answer['model'];
                if (modelName != 'None') {
                    config.model = modelName;
                }
                config.route = answer['routingPath'];
                callback(config);
            });
        } else {
            let q:Array<Question> = [
                <Question>{
                    name: 'routingPath',
                    type: 'input',
                    message: 'Routing Path: ',
                    choices: models,
                    default: '/'
                },
                <Question>{
                    name: 'models',
                    message: 'choose Model for CRUD (select none for create controller for all model): ',
                    type: 'checkbox',
                    choices: models,
                    default: 'None'
                }];
            config.name = name;
            inquirer.prompt(q, answer => {
                let models = answer['models'];
                if (models != 'None') {
                    config.model = models;
                }
                config.route = answer['routingPath'];
                callback(config);
            });
        }
    }
}
