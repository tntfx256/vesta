import * as fs from "fs-extra";
import * as path from "path";
import * as _ from "lodash";
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
import {StringUtil} from "../../../util/StringUtil";

export interface IExpressControllerConfig {
    route: string;
    name: string;
    model: string;
}

export class ExpressControllerGen {
    private controllerClass: ClassGen;
    private controllerFile: TsFileGen;
    private rawName: string;
    private routeMethod: MethodGen;
    private path: string = 'src/api';
    private routingPath: string = '/';
    private vesta: Vesta;
    private apiVersion: string;
    private filesFields: IModelFields = null;
    private relationsFields: IModelFields = null;

    constructor(private config: IExpressControllerConfig) {
        this.vesta = Vesta.getInstance();
        if (this.vesta.isV2) {
            this.path = 'src/server/api';
        }
        this.init(this.vesta.getVersion().api);
    }

    private init(version: string) {
        if (!version) {
            return Log.error('Unable to obtain the API version!');
        }
        this.apiVersion = version;
        this.path = path.join(this.path, version, 'controller', this.config.route);
        this.rawName = _.camelCase(this.config.name);
        let controllerName = StringUtil.fcUpper(this.rawName) + 'Controller';
        this.normalizeRoutingPath();
        this.controllerFile = new TsFileGen(controllerName);
        this.controllerClass = this.controllerFile.addClass();
        this.filesFields = ModelGen.getFieldsByType(this.config.model, FieldType.File);
        if (this.filesFields) {
            this.controllerFile.addImport('* as path', 'path');
        }
        this.controllerFile.addImport('{Response, Router, NextFunction}', 'express');
        this.controllerFile.addImport('{BaseController, IExtRequest}', Util.genRelativePath(this.path, this.vesta.isV2 ? 'src/server/api/BaseController' : 'src/api/BaseController'));
        this.controllerClass.setParentClass('BaseController');
        this.routeMethod = this.controllerClass.addMethod('route');
        this.routeMethod.addParameter({name: 'router', type: 'Router'});
        this.controllerClass.addMethod('init', ClassGen.Access.Protected);
        try {
            fs.mkdirpSync(this.path);
        } catch (e) {
        }
    }

    private addResponseMethod(name: string) {
        let method = this.controllerClass.addMethod(name);
        method.addParameter({name: 'req', type: 'IExtRequest'});
        method.addParameter({name: 'res', type: 'Response'});
        method.addParameter({name: 'next', type: 'NextFunction'});
        method.setContent(`return next({message: '${name} has not been implemented'})`);
        return method;
    }

    private addCRUDOperations() {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = _.camelCase(modelName),
            modelClassName = StringUtil.fcUpper(modelInstanceName);
        this.relationsFields = ModelGen.getFieldsByType(this.config.model, FieldType.Relation);
        this.controllerFile.addImport(`{Err}`, this.vesta.isV2 ? 'vesta-lib/Err' : 'vesta-util/Err');
        this.controllerFile.addImport(`{DatabaseError}`, this.vesta.isV2 ? 'vesta-lib/error/DatabaseError' : 'vesta-schema/error/DatabaseError');
        this.controllerFile.addImport(`{ValidationError}`, this.vesta.isV2 ? 'vesta-lib/error/ValidationError' : 'vesta-schema/error/ValidationError');
        this.controllerFile.addImport(`{${modelClassName}, I${modelClassName}}`, Util.genRelativePath(this.path, `src/cmn/models/${this.config.model}`));
        if (modelClassName != 'Permission') {
            this.controllerFile.addImport(`{Permission}`, Util.genRelativePath(this.path, `src/cmn/models/Permission`));
        }
        this.controllerFile.addImport(`{Vql}`, this.vesta.isV2 ? 'vesta-lib/Vql' : 'vesta-schema/Vql');
        let acl = this.routingPath.replace(/\/+/g, '.');
        acl = acl[0] == '.' ? acl.slice(1) : acl;
        let middleWares = ` this.checkAcl('${acl}', __ACTION__),`;
        // count operation
        let methodName = `get${modelClassName}Count`;
        let methodBasedMiddleWares = middleWares.replace('__ACTION__', 'Permission.Action.Read');
        this.addResponseMethod(methodName).setContent(this.getCountCode());
        this.routeMethod.appendContent(`router.get('${this.routingPath}/count',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        //
        methodName = 'get' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACTION__', 'Permission.Action.Read');
        this.addResponseMethod(methodName).setContent(this.getQueryCode(true));
        this.routeMethod.appendContent(`router.get('${this.routingPath}/:id',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        //
        methodName = 'get' + Util.plural(modelClassName);
        this.addResponseMethod(methodName).setContent(this.getQueryCode(false));
        this.routeMethod.appendContent(`router.get('${this.routingPath}',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        //
        methodName = 'add' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACTION__', 'Permission.Action.Add');
        this.addResponseMethod(methodName).setContent(this.getInsertCode());
        this.routeMethod.appendContent(`router.post('${this.routingPath}',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        //
        methodName = 'update' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACTION__', 'Permission.Action.Edit');
        this.addResponseMethod(methodName).setContent(this.getUpdateCode());
        this.routeMethod.appendContent(`router.put('${this.routingPath}',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        //
        methodName = 'remove' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACTION__', 'Permission.Action.Delete');
        this.addResponseMethod(methodName).setContent(this.getDeleteCode());
        this.routeMethod.appendContent(`router.delete('${this.routingPath}/:id',${methodBasedMiddleWares} this.${methodName}.bind(this));`);
        // file upload
        if (this.filesFields) {
            methodName = 'upload';
            methodBasedMiddleWares = middleWares.replace('__ACTION__', 'Permission.Action.Edit');
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
        let extPath = this.vesta.isV2 ? '/server' : '';
        let filePath = `src${extPath}/api/${apiVersion}/import.ts`;
        let code = fs.readFileSync(filePath, {encoding: 'utf8'});
        if (code.search(Placeholder.ExpressController)) {
            let relPath = Util.genRelativePath(`src${extPath}/api/${apiVersion}`, this.path);
            let importCode = `import {${this.controllerClass.name}} from '${relPath}/${this.controllerClass.name}';`;
            if (code.indexOf(importCode) >= 0) return;
            let embedCode = `${_.camelCase(this.config.name)}: ${this.controllerClass.name},`;
            code = code.replace(Placeholder.Import, `${importCode}\n${Placeholder.Import}`);
            code = code.replace(Placeholder.ExpressController, `${embedCode}\n\t\t${Placeholder.ExpressController}`);
            FsUtil.writeFile(filePath, code);
        }
    }

    private normalizeRoutingPath(): void {
        let edge = _.camelCase(this.config.name);
        this.routingPath = `${this.config.route}`;
        if (this.routingPath.charAt(0) != '/') this.routingPath = `/${this.routingPath}`;
        this.routingPath += `/${edge}`;
        this.routingPath = this.routingPath.replace(/\/{2,}/g, '/');
    }

    private getQueryCodeForSingleInstance(): string {
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
            .then(result => {
                if (result.items.length > 1) throw new DatabaseError(Err.Code.DBRecordCount, null);
                res.json(result);
            })
            .catch(error => next(error));`;
    }

    private getQueryCodeForMultiInstance(): string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = _.camelCase(modelName);
        return `let query = new Vql(${modelName}.schema.name);
        let filter = req.query.query;
        if (filter) {
            let ${modelInstanceName} = new ${modelName}(filter);
            let validationError = ${modelInstanceName}.validate(...Object.keys(filter));
            if (validationError) {
                return next(new ValidationError(validationError));
            }
            query.filter(filter);
        }
        query.limitTo(Math.min(+req.query.limit || this.MAX_FETCH_COUNT, this.MAX_FETCH_COUNT))
            .fromPage(+req.query.page || 1);
        if (req.query.orderBy) {
            let orderBy = req.query.orderBy[0];
            query.sortBy(orderBy.field, orderBy.ascending == 'true');
        }
        ${modelName}.findByQuery(query)
            .then(result => res.json(result))
            .catch(error => next(error));`;
    }

    private getCountCode(): string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = _.camelCase(modelName);
        return `let query = new Vql(${modelName}.schema.name);
        let filter = req.query.query;
        if (filter) {
            let ${modelInstanceName} = new ${modelName}(filter);
            let validationError = ${modelInstanceName}.validate(...Object.keys(filter));
            if (validationError) {
                return next(new ValidationError(validationError));
            }
            query.filter(filter);
        }
        ${modelName}.count(query)
            .then(result => res.json(result))
            .catch(error => next(error));`;
    }

    private getQueryCode(isSingle: boolean): string {
        return isSingle ? this.getQueryCodeForSingleInstance() : this.getQueryCodeForMultiInstance();
    }

    private getInsertCode(): string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = _.camelCase(modelName);
        return `let ${modelInstanceName} = new ${modelName}(req.body),
            validationError = ${modelInstanceName}.validate();
        if (validationError) {
            return next(new ValidationError(validationError));
        }
        ${modelInstanceName}.insert<I${modelName}>()
            .then(result => res.json(result))
            .catch(error => next(error));`;
    }

    private getUpdateCode(): string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = _.camelCase(modelName);
        return `let ${modelInstanceName} = new ${modelName}(req.body),
            validationError = ${modelInstanceName}.validate();
        if (validationError) {
            return next(new ValidationError(validationError));
        }
        ${modelName}.findById<I${modelName}>(${modelInstanceName}.id)
            .then(result => {
                if (result.items.length == 1) return ${modelInstanceName}.update<I${modelName}>().then(result => res.json(result));
                throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
            })
            .catch(error => next(error));`;
    }

    private getDeleteCode(): string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = _.camelCase(modelName);
        return `let ${modelInstanceName} = new ${modelName}({id: req.params.id});
        ${modelInstanceName}.delete()
            .then(result => res.json(result))
            .catch(error => next(error));`;
    }

    private getUploadCode(): string {
        this.controllerFile.addImport('{FileUploader}', Util.genRelativePath(this.path, this.vesta.isV2 ? 'src/server/helpers/FileUploader' : 'src/helpers/FileUploader'));
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = _.camelCase(modelName);
        let code = '';
        let fileNames = Object.keys(this.filesFields);
        if (fileNames.length == 1) {
            code = `let oldFileName = ${modelInstanceName}.${fileNames[0]};
                ${modelInstanceName}.${fileNames[0]} = upl.${fileNames[0]};
                return FileUploader.checkAndDeleteFile(\`\${destDirectory}/\${oldFileName}\`);`;
        } else {
            code = `let delList:Array<Promise<string>> = [];`;
            for (let i = 0, il = fileNames.length; i < il; ++i) {
                let oldName = `old${StringUtil.fcUpper(fileNames[i])}`;
                code += `
                if (upl.${fileNames[i]}) {
                    let ${oldName} = ${modelInstanceName}.${fileNames[i]};
                    delList.push(FileUploader.checkAndDeleteFile(\`\${destDirectory}/\${${oldName}}\`)
                        .then(() => ${modelInstanceName}.${fileNames[i]} = upl.${fileNames[i]}));
                }`
            }
            code += `
                return Promise.all(delList);`;
        }
        return `let ${modelInstanceName}: ${modelName};
        let destDirectory = path.join(this.setting.dir.upload, '${modelInstanceName}');
        ${modelName}.findById<I${modelName}>(+req.params.id)
            .then(result => {
                if (result.items.length != 1) throw new Err(Err.Code.DBRecordCount, '${modelName} not found');
                ${modelInstanceName} = new ${modelName}(result.items[0]);
                let uploader = new FileUploader<I${modelName}>(destDirectory);
                return uploader.upload(req);
            })
            .then(upl => {
                ${code}
            })
            .then(() => ${modelInstanceName}.update())
            .then(result => res.json(result))
            .catch(reason => next(new Err(reason.error.code, reason.error.message)));`;
    }

    public static getGeneratorConfig(name: string, callback) {
        let config: IExpressControllerConfig = <IExpressControllerConfig>{};
        let models = Object.keys(ModelGen.getModelsList());
        models.unshift('None');
        if (name) {
            let q: Array<Question> = [
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
            Util.prompt<{ routingPath: string; model: string; }>(q).then(answer => {
                let modelName = answer.model;
                if (modelName != 'None') {
                    config.model = modelName;
                }
                config.route = answer.routingPath;
                callback(config);
            });
        } else {
            let q: Array<Question> = [
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
            Util.prompt<{ routingPath: string; models: string; }>(q).then(answer => {
                let models = answer.models;
                if (models != 'None') {
                    config.model = models;
                }
                config.route = answer.routingPath;
                callback(config);
            });
        }
    }
}
