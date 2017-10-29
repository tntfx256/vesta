import * as fs from "fs-extra";
import * as path from "path";
import {ClassGen} from "../../core/ClassGen";
import {TsFileGen} from "../../core/TSFileGen";
import {MethodGen} from "../../core/MethodGen";
import {Vesta} from "../../file/Vesta";
import {Placeholder} from "../../core/Placeholder";
import {ModelGen} from "../ModelGen";
import {Log} from "../../../util/Log";
import {FieldType, IModelFields} from "@vesta/core";
import {ArgParser} from "../../../util/ArgParser";
import {camelCase, fcUpper, plural} from "../../../util/StringUtil";
import {genRelativePath, writeFile} from "../../../util/FsUtil";

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
    private ownerVerifiedFields: Array<string> = [];
    private confidentialFields: Array<string> = [];

    constructor(private config: IExpressControllerConfig) {
        this.vesta = Vesta.getInstance();
        this.init(this.vesta.getVersion().api);
    }

    private init(version: string) {
        if (!version) {
            return Log.error('Unable to obtain the API version!');
        }
        this.apiVersion = version;
        this.path = path.join(this.path, version, 'controller', this.config.route);
        this.rawName = camelCase(this.config.name);
        let controllerName = fcUpper(this.rawName) + 'Controller';
        this.normalizeRoutingPath();
        this.controllerFile = new TsFileGen(controllerName);
        this.controllerClass = this.controllerFile.addClass();
        if (this.config.model) {
            this.filesFields = ModelGen.getFieldsByType(this.config.model, FieldType.File);
        }
        if (this.filesFields) {
            this.controllerFile.addImport(['join'], 'path');
        }
        this.controllerFile.addImport(['NextFunction', 'Response', 'Router'], 'express');
        this.controllerFile.addImport(['BaseController', 'IExtRequest'], genRelativePath(this.path, 'src/api/BaseController'));
        this.controllerClass.setParentClass('BaseController');
        this.routeMethod = this.controllerClass.addMethod('route');
        this.routeMethod.addParameter({name: 'router', type: 'Router'});
        // this.controllerClass.addMethod('init', ClassGen.Access.Protected);
        try {
            fs.mkdirpSync(this.path);
        } catch (e) {
        }
    }

    private addResponseMethod(name: string) {
        let method = this.controllerClass.addMethod(name, ClassGen.Access.Public, false, false, true);
        method.addParameter({name: 'req', type: 'IExtRequest'});
        method.addParameter({name: 'res', type: 'Response'});
        method.addParameter({name: 'next', type: 'NextFunction'});
        method.setContent(`return next({message: '${name} has not been implemented'})`);
        return method;
    }

    private addCRUDOperations() {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = camelCase(modelName),
            modelClassName = fcUpper(modelInstanceName);
        this.relationsFields = ModelGen.getFieldsByType(this.config.model, FieldType.Relation);
        this.ownerVerifiedFields = ModelGen.getOwnerVerifiedFields(this.config.model);
        this.confidentialFields = ModelGen.getConfidentialFields(this.config.model);
        this.controllerFile.addImport(['Err'], genRelativePath(this.path, 'src/cmn/core/Err'));
        this.controllerFile.addImport(['DatabaseError'], genRelativePath(this.path, 'src/cmn/core/error/DatabaseError'));
        this.controllerFile.addImport(['ValidationError'], genRelativePath(this.path, 'src/cmn/core/error/ValidationError'));
        this.controllerFile.addImport([modelClassName, `I${modelClassName}`], genRelativePath(this.path, `src/cmn/models/${this.config.model}`));
        this.controllerFile.addImport(['AclAction'], genRelativePath(this.path, `src/cmn/enum/Acl`));
        let acl = this.routingPath.replace(/\/+/g, '.');
        acl = acl[0] == '.' ? acl.slice(1) : acl;
        let middleWares = ` this.checkAcl('${acl}', __ACTION__),`;
        // count operation
        let methodName = `get${modelClassName}Count`;
        let methodBasedMiddleWares = middleWares.replace('__ACTION__', 'AclAction.Read');
        this.addResponseMethod(methodName).setContent(this.getCountCode());
        this.routeMethod.appendContent(`router.get('${this.routingPath}/count',${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
        //
        methodName = 'get' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACTION__', 'AclAction.Read');
        this.addResponseMethod(methodName).setContent(this.getQueryCode(true));
        this.routeMethod.appendContent(`router.get('${this.routingPath}/:id',${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
        //
        methodName = 'get' + plural(modelClassName);
        this.addResponseMethod(methodName).setContent(this.getQueryCode(false));
        this.routeMethod.appendContent(`router.get('${this.routingPath}',${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
        //
        methodName = 'add' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACTION__', 'AclAction.Add');
        this.addResponseMethod(methodName).setContent(this.getInsertCode());
        this.routeMethod.appendContent(`router.post('${this.routingPath}',${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
        //
        methodName = 'update' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACTION__', 'AclAction.Edit');
        this.addResponseMethod(methodName).setContent(this.getUpdateCode());
        this.routeMethod.appendContent(`router.put('${this.routingPath}',${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
        //
        methodName = 'remove' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACTION__', 'AclAction.Delete');
        this.addResponseMethod(methodName).setContent(this.getDeleteCode());
        this.routeMethod.appendContent(`router.delete('${this.routingPath}/:id',${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
        // file upload
        if (this.filesFields) {
            methodName = 'upload';
            methodBasedMiddleWares = middleWares.replace('__ACTION__', 'AclAction.Edit');
            this.addResponseMethod(methodName).setContent(this.getUploadCode());
            this.routeMethod.appendContent(`router.post('${this.routingPath}/file/:id',${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
        }
    }

    public generate() {
        if (this.config.model) {
            this.addCRUDOperations();
        }
        writeFile(path.join(this.path, `${this.controllerClass.name}.ts`), this.controllerFile.generate());
        let apiVersion = this.vesta.getVersion().api;
        let filePath = `src/api/${apiVersion}/import.ts`;
        let code = fs.readFileSync(filePath, {encoding: 'utf8'});
        if (code.search(Placeholder.ExpressController)) {
            let relPath = genRelativePath(`src/api/${apiVersion}`, this.path);
            let importCode = `import {${this.controllerClass.name}} from '${relPath}/${this.controllerClass.name}';`;
            if (code.indexOf(importCode) >= 0) return;
            let embedCode = `${camelCase(this.config.name)}: ${this.controllerClass.name},`;
            code = code.replace(Placeholder.Import, `${importCode}\n${Placeholder.Import}`);
            code = code.replace(Placeholder.ExpressController, `${embedCode}\n\t\t${Placeholder.ExpressController}`);
            writeFile(filePath, code);
        }
    }

    private normalizeRoutingPath(): void {
        let edge = camelCase(this.config.name);
        this.routingPath = `${this.config.route}`;
        if (this.routingPath.charAt(0) != '/') this.routingPath = `/${this.routingPath}`;
        this.routingPath += `/${edge}`;
        this.routingPath = this.routingPath.replace(/\/{2,}/g, '/');
    }

    private getAuthUserCode(): string {
        return this.ownerVerifiedFields.length ? `const authUser = this.getUserFromSession(req);
        const isAdmin = this.isAdmin(authUser);\n\t\t` : '';
    }

    private getConfFieldRemovingCode(singleRecord?: boolean): string {
        let confRemovers = [];
        let index = singleRecord ? '0' : 'i';
        if (!this.confidentialFields.length) {
            for (let i = this.confidentialFields.length; i--;) {
                confRemovers.push(`delete result.items[${index}].${this.confidentialFields[i]};`);
            }
        }
        // checking confidentiality of relations
        if (this.relationsFields) {
            let relationFieldsNames = Object.keys(this.relationsFields);
            for (let i = relationFieldsNames.length; i--;) {
                let meta = ModelGen.getFieldMeta(this.config.model, relationFieldsNames[i]);
                let extPath = meta.relation.path ? `/${meta.relation.path}` : '';
                let relConfFields = ModelGen.getConfidentialFields(meta.relation.model);
                if (relConfFields.length) {
                    this.controllerFile.addImport([`I${meta.relation.model}`], genRelativePath(this.path, `src/cmn/models${extPath}/${meta.relation.model}`));
                    for (let j = relConfFields.length; j--;) {
                        confRemovers.push(`delete (<I${meta.relation.model}>result.items[${index}].${relationFieldsNames[i]}).${relConfFields[j]};`);
                    }
                }
            }
        }
        let code = '';
        if (confRemovers.length) {
            if (singleRecord) {
                code = `\n\t\t${confRemovers.join('\n\t\t')}`;
            } else {
                code = `\n\t\tfor (let i = result.items.length; i--;) {
            ${confRemovers.join('\n\t\t\t')}
        }`
            }
        }
        return code;
    }

    private getQueryCodeForSingleInstance(): string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let ownerChecks = [];
        for (let i = this.ownerVerifiedFields.length; i--;) {
            let meta = ModelGen.getFieldMeta(this.config.model, this.ownerVerifiedFields[i]);
            if (meta.relation) {
                let extPath = meta.relation.path ? `/${meta.relation.path}` : '';
                this.controllerFile.addImport([`I${meta.relation.model}`], genRelativePath(this.path, `src/cmn/models${extPath}/${meta.relation.model}`));
                ownerChecks.push(`(<I${meta.relation.model}>result.items[0].${this.ownerVerifiedFields}).id != authUser.id`);
            } else {
                ownerChecks.push(`result.items[0].${this.ownerVerifiedFields} != authUser.id`);
            }
        }
        let ownerCheckCode = ownerChecks.length ? ` || (!isAdmin && (${ownerChecks.join(' || ')}))` : '';
        let relationFields = this.relationsFields ? `, {relations: ['${Object.keys(this.relationsFields).join("', '")}']}` : '';
        return `${this.getAuthUserCode()}const id = this.retrieveId(req);
        let result = await ${modelName}.find<I${modelName}>(id${relationFields});
        if (result.items.length != 1${ownerCheckCode}) {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }${this.getConfFieldRemovingCode(true)}
        res.json(result);`;
    }

    private getQueryCodeForMultiInstance(): string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let ownerQueries = [];
        for (let i = this.ownerVerifiedFields.length; i--;) {
            ownerQueries.push(`${this.ownerVerifiedFields[i]}: authUser.id`);
        }
        let ownerQueriesCode = ownerQueries.length ? `\n\t\tif (!isAdmin) {
            query.filter({${ownerQueries.join(', ')}});
        }` : '';
        return `${this.getAuthUserCode()}let query = this.query2vql(${modelName}, req.query);${ownerQueriesCode}
        let result = await ${modelName}.find<I${modelName}>(query);${this.getConfFieldRemovingCode()}
        res.json(result);`;
    }

    private getCountCode(): string {
        let modelName = ModelGen.extractModelName(this.config.model);
        // let modelInstanceName = camelCase(modelName);
        return `let query = this.query2vql(${modelName}, req.query, true);
        let result = await ${modelName}.count<I${modelName}>(query);
        res.json(result);`
    }

    private getQueryCode(isSingle: boolean): string {
        return isSingle ? this.getQueryCodeForSingleInstance() : this.getQueryCodeForMultiInstance();
    }

    private getInsertCode(): string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = camelCase(modelName);
        let ownerAssigns = [];
        for (let i = this.ownerVerifiedFields.length; i--;) {
            ownerAssigns.push(`${modelInstanceName}.${this.ownerVerifiedFields[i]} = authUser.id;`);
        }
        let ownerAssignCode = ownerAssigns.length ? `\n\t\tif (!isAdmin) {
            ${ownerAssigns.join('\n\t\t')}
        }` : '';
        return `${this.getAuthUserCode()}let ${modelInstanceName} = new ${modelName}(req.body);${ownerAssignCode}
        let validationError = ${modelInstanceName}.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await ${modelInstanceName}.insert<I${modelName}>();${this.getConfFieldRemovingCode(true)}
        res.json(result);`;
    }

    private getUpdateCode(): string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = camelCase(modelName);
        let ownerChecks = [];
        for (let i = this.ownerVerifiedFields.length; i--;) {
            ownerChecks.push(`${modelInstanceName}.${this.ownerVerifiedFields} = authUser.id;`);
        }
        let ownerCheckCode = ownerChecks.length ? `\n\t\tif (!isAdmin) {\n\t\t\t${ownerChecks.join('\n\t\t\t')}\n\t\t}` : '';
        return `${this.getAuthUserCode()}let ${modelInstanceName} = new ${modelName}(req.body);${ownerCheckCode}
        let validationError = ${modelInstanceName}.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await ${modelName}.find<I${modelName}>(${modelInstanceName}.id);
        if (result.items.length != 1) {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
        let uResult = await ${modelInstanceName}.update<I${modelName}>();${this.getConfFieldRemovingCode(true)}
        res.json(uResult);`;
    }

    private getDeleteCode(): string {
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = camelCase(modelName);
        let ownerChecks = [];
        if (this.ownerVerifiedFields.length) {
            for (let i = this.ownerVerifiedFields.length; i--;) {
                ownerChecks.push(`result.items[0].${this.ownerVerifiedFields} != authUser.id`);
            }
        }
        let ownerCheckCode = ownerChecks.length ? `
        if (!isAdmin) {
            const result = await ${modelName}.find<I${modelName}>({id});
            if (result.items.length != 1 || ${ownerChecks.join(' || ')}) {
                throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
            }
        }` : '';
        return `${this.getAuthUserCode()}const id = this.retrieveId(req);${ownerCheckCode}
        let ${modelInstanceName} = new ${modelName}({id});
        let dResult = await ${modelInstanceName}.remove();
        res.json(dResult);`;
    }

    private getUploadCode(): string {
        //todo add conf & owner
        this.controllerFile.addImport(['FileUploader'], genRelativePath(this.path, 'src/helpers/FileUploader'));
        let modelName = ModelGen.extractModelName(this.config.model);
        let modelInstanceName = camelCase(modelName);
        let code = '';
        let fileNames = Object.keys(this.filesFields);
        if (fileNames.length == 1) {
            code = `let oldFileName = ${modelInstanceName}.${fileNames[0]};
        ${modelInstanceName}.${fileNames[0]} = upl.${fileNames[0]};
        await FileUploader.checkAndDeleteFile(\`\${destDirectory}/\${oldFileName}\`);`;
        } else {
            code = `let delList:Array<Promise<string>> = [];`;
            for (let i = 0, il = fileNames.length; i < il; ++i) {
                let oldName = `old${fcUpper(fileNames[i])}`;
                code += `
        if (upl.${fileNames[i]}) {
            let ${oldName} = ${modelInstanceName}.${fileNames[i]};
            delList.push(FileUploader.checkAndDeleteFile(\`\${destDirectory}/\${${oldName}}\`)
                .then(() => ${modelInstanceName}.${fileNames[i]} = upl.${fileNames[i]}));
        }`
            }
            code += `
        await Promise.all(delList);`;
        }
        return `const id = this.retrieveId(req);
        let ${modelInstanceName}: ${modelName};
        let destDirectory = join(this.config.dir.upload, '${modelInstanceName}');
        let result = await ${modelName}.find<I${modelName}>(id);
        if (result.items.length != 1) throw new Err(Err.Code.DBRecordCount, '${modelName} not found');
        ${modelInstanceName} = new ${modelName}(result.items[0]);
        let uploader = new FileUploader<I${modelName}>(destDirectory);
        let upl = await uploader.upload(req);
        ${code}
        let uResult = await ${modelInstanceName}.update();    
        res.json(uResult);`;
    }

    public static init(): IExpressControllerConfig {
        const argParser = ArgParser.getInstance();
        let config: IExpressControllerConfig = {
            name: argParser.get(),
            model: argParser.get('--model', null),
            route: argParser.get('--route', '/')
        };
        if (!config.name || !/^[a-z]+$/i.exec(config.name)) {
            Log.error("Missing/Invalid controller name\nSee 'vesta gen controller --help' for more information\n");
            return;
        }
        let controller = new ExpressControllerGen(config);
        controller.generate();
    }

    static help() {
        Log.write(`
Usage: vesta gen controller <NAME> [options...]

Creating a server side (Vesta API) controller 

    NAME        The name of the controller
    
Options:
    --model     Generates CRUD controller on specified model
    --route     Routing path
`);
    }
}
