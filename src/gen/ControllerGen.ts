import { Field, FieldType } from "@vesta/core";
import { camelCase } from "lodash";
import { join } from "path";
import { ArgParser } from "../util/ArgParser";
import { genRelativePath, mkdir, saveCodeToFile } from "../util/FsUtil";
import { Log } from "../util/Log";
import { getConfidentialFields, getFieldMeta, getFieldsByType, getOwnerVerifiedFields, parseModel } from "../util/Model";
import { pascalCase, plural } from "../util/StringUtil";
import { IModelConfig } from "./ComponentGen";
import { ClassGen } from "./core/ClassGen";
import { MethodGen } from "./core/MethodGen";
import { Access } from "./core/StructureGen";
import { TsFileGen } from "./core/TSFileGen";

export interface IControllerConfig {
  model: string;
  name: string;
  route: string;
  version: string;
}

export class ControllerGen {
  public static help() {
    Log.write(`
Usage: vesta gen controller <NAME> [options...]

Creating a server side (Vesta API) controller

    NAME        The name of the controller

Options:
    --model     Generates CRUD controller for specified model
    --route     Routing path
    --version   api version [v1]

Examples:
    vesta gen controller simple
    vesta gen controller profile --model=User --route=account
`);
  }

  public static init(): IControllerConfig {
    const argParser = ArgParser.getInstance();
    const config: IControllerConfig = {
      model: argParser.get("model", null),
      name: argParser.get(),
      route: argParser.get("route", "/"),
      version: argParser.get("version", "v1"),
    };

    if (!config.name || !/^[a-z]+$/i.exec(config.name)) {
      Log.error("Missing/Invalid controller name\nSee 'vesta gen controller --help' for more information\n");
      return;
    }

    config.model = pascalCase(config.model);

    const controller = new ControllerGen(config);
    controller.generate();
  }

  private apiVersion: string;
  private controllerFile: TsFileGen;
  private controllerClass: ClassGen;
  private routeMethod: MethodGen;
  private model: IModelConfig;
  private confidentialFields: string[] = [];
  private filesFields: Field[] = [];
  private ownerVerifiedFields: string[] = [];
  private relationsFields: Field[] = [];
  private path: string = "src/api";
  private rawName: string;
  private routingPath: string = "/";

  constructor(private config: IControllerConfig) {
    this.apiVersion = config.version;
    this.init();
  }

  public generate() {
    if (this.config.model) {
      this.addCRUDOperations();
    }
    saveCodeToFile(join(this.path, `${this.controllerClass.name}.ts`), this.controllerFile.generate());
  }

  private init() {
    this.path = join(this.path, this.apiVersion, "controllers", this.config.route);
    this.rawName = camelCase(this.config.name);
    const controllerName = pascalCase(this.rawName) + "Controller";
    this.normalizeRoutingPath();
    this.controllerFile = new TsFileGen(controllerName);
    this.controllerClass = this.controllerFile.addClass();
    this.controllerClass.shouldExport(true);
    this.controllerFile.addImport(["Response", "Router"], "express");
    this.controllerFile.addImport(["BaseController", "ExtRequest"], genRelativePath(this.path, "src/api/BaseController"));
    this.controllerClass.setParentClass("BaseController");
    this.routeMethod = this.controllerClass.addMethod({ name: "route", access: Access.Public });
    this.routeMethod.doNotSort();
    this.routeMethod.addParameter({ name: "router", type: "Router" });
    mkdir(this.path);
  }

  private addResponseMethod(name: string) {
    // they are set to public for testing
    const method = this.controllerClass.addMethod({ name, access: Access.Public, isAsync: true });
    method.addParameter({ name: "req", type: "ExtRequest" });
    method.addParameter({ name: "res", type: "Response" });
    // method.addParameter({ name: "next", type: "NextFunction" });
    // method.appendContent(`return next({message: '${name} has not been implemented'})`);
    return method;
  }

  private addCRUDOperations() {
    this.model = parseModel(this.config.model);
    if (!this.model) {
      return;
    }
    this.filesFields = getFieldsByType(this.config.model, FieldType.File);
    this.relationsFields = getFieldsByType(this.config.model, FieldType.Relation);
    this.ownerVerifiedFields = getOwnerVerifiedFields(this.config.model);
    this.confidentialFields = getConfidentialFields(this.config.model);

    this.controllerFile.addImport(["Err", "DatabaseError", "ValidationError"], "@vesta/core");
    this.controllerFile.addImport([this.model.className], genRelativePath(this.path, `src/cmn/models`));
    if (this.filesFields.length) {
      this.controllerFile.addImport([this.model.interfaceName], genRelativePath(this.path, `src/cmn/models`));
    }
    this.controllerFile.addImport(["AclAction"], "@vesta/services");
    let acl = this.routingPath.replace(/\/+/g, ".");
    acl = acl[0] === "." ? acl.slice(1) : acl;
    const middleWares = ` this.checkAcl("${acl}", __ACTION__),`;
    // count operation
    let methodName = `get${this.model.className}Count`;
    let methodBasedMiddleWares = middleWares.replace("__ACTION__", "AclAction.Read");
    this.addResponseMethod(methodName).appendContent(this.getCountCode());
    // tslint:disable-next-line:max-line-length
    this.routeMethod.appendContent(`router.get("${this.routingPath}/count",${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
    //
    methodName = "get" + this.model.className;
    methodBasedMiddleWares = middleWares.replace("__ACTION__", "AclAction.Read");
    this.addResponseMethod(methodName).appendContent(this.getQueryCode(true));
    // tslint:disable-next-line:max-line-length
    this.routeMethod.appendContent(`router.get("${this.routingPath}/:id",${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
    //
    methodName = "get" + plural(this.model.className);
    this.addResponseMethod(methodName).appendContent(this.getQueryCode(false));
    // tslint:disable-next-line:max-line-length
    this.routeMethod.appendContent(`router.get("${this.routingPath}",${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
    //
    methodName = "add" + this.model.className;
    methodBasedMiddleWares = middleWares.replace("__ACTION__", "AclAction.Add");
    this.addResponseMethod(methodName).appendContent(this.getInsertCode());
    // tslint:disable-next-line:max-line-length
    this.routeMethod.appendContent(`router.post("${this.routingPath}",${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
    //
    methodName = "update" + this.model.className;
    methodBasedMiddleWares = middleWares.replace("__ACTION__", "AclAction.Edit");
    this.addResponseMethod(methodName).appendContent(this.getUpdateCode());
    // tslint:disable-next-line:max-line-length
    this.routeMethod.appendContent(`router.put("${this.routingPath}",${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
    //
    methodName = "remove" + this.model.className;
    methodBasedMiddleWares = middleWares.replace("__ACTION__", "AclAction.Delete");
    this.addResponseMethod(methodName).appendContent(this.getDeleteCode());
    // tslint:disable-next-line:max-line-length
    this.routeMethod.appendContent(`router.delete("${this.routingPath}/:id",${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
    // file upload
    if (this.filesFields.length) {
      methodName = "upload";
      methodBasedMiddleWares = middleWares.replace("__ACTION__", "AclAction.Edit");
      this.addResponseMethod(methodName).appendContent(this.getUploadCode());
      // tslint:disable-next-line:max-line-length
      this.routeMethod.appendContent(`router.post("${this.routingPath}/file/:id",${methodBasedMiddleWares} this.wrap(this.${methodName}));`);
    }
  }

  private normalizeRoutingPath(): void {
    const edge = camelCase(this.config.name);
    this.routingPath = `${this.config.route}`;
    if (this.routingPath.charAt(0) !== "/") {
      this.routingPath = `/${this.routingPath}`;
    }
    this.routingPath += `/${edge}`;
    this.routingPath = this.routingPath.replace(/\/{2,}/g, "/");
  }

  private getAuthUserCode(): string {
    return this.ownerVerifiedFields.length
      ? `const authUser = this.getUserFromSession(req);
        const isAdmin = this.isAdmin(authUser);\n\t\t`
      : "";
  }

  private getConfFieldRemovingCode(singleRecord?: boolean, variableName = "result"): string {
    const confRemovers = [];
    const index = singleRecord ? "." : "[i].";

    if (this.confidentialFields.length) {
      for (let i = this.confidentialFields.length; i--; ) {
        confRemovers.push(`delete ${variableName}${index}${this.confidentialFields[i]};`);
      }
    }
    // checking confidentiality of relations
    for (const field of this.relationsFields) {
      const meta = getFieldMeta(this.config.model, field.name);
      const extPath = meta.relation.path ? `/${meta.relation.path}` : "";
      const relConfFields = getConfidentialFields(meta.relation.model);
      if (relConfFields.length) {
        this.controllerFile.addImport([`I${meta.relation.model}`], genRelativePath(this.path, `src/cmn/models${extPath}/${meta.relation.model}`));
        for (let j = relConfFields.length; j--; ) {
          confRemovers.push(`delete (${variableName}${index}${field.name} as I${meta.relation.model}).${relConfFields[j]};`);
        }
      }
    }

    let code = "";
    if (confRemovers.length) {
      if (singleRecord) {
        code = `\n\t\t${confRemovers.join("\n\t\t")}`;
      } else {
        code = `\n\t\tfor (let i = ${variableName}.length; i--;) {
            ${confRemovers.join("\n\t\t\t")}
        }`;
      }
    }
    return code;
  }

  private getQueryCodeForSingleInstance(): string {
    const ownerChecks = [];
    for (let i = this.ownerVerifiedFields.length; i--; ) {
      const meta = getFieldMeta(this.config.model, this.ownerVerifiedFields[i]);
      if (meta.relation) {
        const extPath = meta.relation.path ? `/${meta.relation.path}` : "";
        this.controllerFile.addImport([`I${meta.relation.model}`], genRelativePath(this.path, `src/cmn/models${extPath}/${meta.relation.model}`));
        // tslint:disable-next-line:max-line-length
        ownerChecks.push(`(result.${this.ownerVerifiedFields} as I${meta.relation.model}).id !== authUser.id`);
      } else {
        ownerChecks.push(`result.${this.ownerVerifiedFields} !== authUser.id`);
      }
    }
    const ownerCheckCode = ownerChecks.length ? ` || (!isAdmin && (${ownerChecks.join(" || ")}))` : "";
    const relationFields = this.relationsFields.length ? `, include: {${this.relationsFields.map((r) => `${r.name}: true`).join(", ")} }` : "";
    return `${this.getAuthUserCode()}const id = this.retrieveId(req);
        const result = await this.db.${this.model.instanceName}.findOne({ where: { id }${relationFields} });
        if (!result${ownerCheckCode}) {
            throw new DatabaseError(Err.Type.DBNoRecord, null);
        }${this.getConfFieldRemovingCode(true)}
        res.json({ items: [result] });`;
  }

  private getQueryCodeForMultiInstance(): string {
    const ownerQueries = [];
    for (let i = this.ownerVerifiedFields.length; i--; ) {
      ownerQueries.push(`${this.ownerVerifiedFields[i]}: authUser.id`);
    }
    const ownerQueriesCode = ownerQueries.length
      ? `\n\t\tif (!isAdmin) {
            query.filter({${ownerQueries.join(", ")}});
        }`
      : "";
    // this.controllerFile.addImport([`FindMany${this.model.className}Args`], "@prisma/client");
    return `${this.getAuthUserCode()}const query = this.parseQuery(req.query);${ownerQueriesCode}
        const result = await this.db.${this.model.instanceName}.findMany(query);${this.getConfFieldRemovingCode()}
        res.json({ items: result });`;
  }

  private getCountCode(): string {
    return `const query = this.parseQuery(req.query, true);
        const result = await this.db.${this.model.instanceName}.count(query);
        res.json({ items: [], total: result });`;
  }

  private getQueryCode(isSingle: boolean): string {
    return isSingle ? this.getQueryCodeForSingleInstance() : this.getQueryCodeForMultiInstance();
  }

  private getInsertCode(): string {
    const relationCode = this.relationsFields
      .map((field: Field) =>
        field.isOneOf
          ? `${field.name}: { connect: { id: ${this.model.instanceName}.${field.name} as number } }`
          : `${field.name}: { connect: (${this.model.instanceName}.${field.name} as number[]).map(id=> ({ id })) }`
      )
      .join(", ");

    const filesCode = this.filesFields.map((f) => `${f.name}: ""`).join(", ");

    const ownerAssigns = [];
    for (let i = this.ownerVerifiedFields.length; i--; ) {
      ownerAssigns.push(`${this.model.instanceName}.${this.ownerVerifiedFields[i]} = authUser.id;`);
    }
    const ownerAssignCode = ownerAssigns.length
      ? `\n\t\tif (!isAdmin) {
            ${ownerAssigns.join("\n\t\t")}
        }`
      : "";
    return `${this.getAuthUserCode()}const ${this.model.instanceName} = new ${this.model.className}(req.body);${ownerAssignCode}
        const violations = ${this.model.instanceName}.validate();
        if (violations) {
            throw new ValidationError(violations);
        }
        const result = await this.db.${this.model.instanceName}.create({ data: { ...${this.model.instanceName}.getValues()${
      relationCode ? ", " : ""
    }${relationCode}${filesCode ? ", " : ""}${filesCode} } });${this.getConfFieldRemovingCode(true)}
        res.json({ items: [result] });`;
  }

  private getUpdateCode(): string {
    const ownerChecks = [];
    const ownerInlineChecks = [];
    for (let i = this.ownerVerifiedFields.length; i--; ) {
      ownerChecks.push(`${this.model.instanceName}.${this.ownerVerifiedFields[i]} = authUser.id;`);
      // check owner of record after finding the record based on recordId
      ownerInlineChecks.push(`${this.model.instanceName}.${this.ownerVerifiedFields[i]} !== authUser.id`);
    }
    const ownerCheckCode = ownerChecks.length ? `\n\t\tif (!isAdmin) {\n\t\t\t${ownerChecks.join("\n\t\t\t")}\n\t\t}` : "";
    const ownerCheckInlineCode = ownerInlineChecks.length ? ` || (!isAdmin && (${ownerInlineChecks.join(" || ")}))` : "";
    const relationCode = [];

    for (const field of this.relationsFields) {
      if (field.isOneOf) {
        relationCode.push(`${field.name}: { connect: { id: ${this.model.instanceName}.${field.name} as number } }`);
      } else if (field.areManyOf) {
        relationCode.push(`${field.name}: { set: (${this.model.instanceName}.${field.name} as number[]).map(id=> ({ id })) }`);
      }
    }

    const filesCode = [];
    if (this.filesFields) {
      for (const field of this.filesFields) {
        filesCode.push(`${field.name}: ${this.model.instanceName}.${field.name} ? result.${field.name} : ""`);
      }
    }
    return `${this.getAuthUserCode()}const ${this.model.instanceName} = new ${this.model.className}(req.body);${ownerCheckCode}
        const violations = ${this.model.instanceName}.validate();
        if (violations) {
            throw new ValidationError(violations);
        }
        const result = await this.db.${this.model.instanceName}.findOne({ where: { id: ${this.model.instanceName}.id } });
        if (!result${ownerCheckInlineCode}) {
            throw new DatabaseError(Err.Type.DBNoRecord, null);
        }
        const uResult = await this.db.${this.model.instanceName}.update({ where: { id: ${this.model.instanceName}.id }, data: { ...${
      this.model.instanceName
    }.getValues()${relationCode.length ? ", " : ""}${relationCode.join(", ")}${filesCode.length ? ", " : ""}${filesCode.join(", ")} } });
    ${this.getConfFieldRemovingCode(true, "uResult")}
        res.json({ items: [uResult] });`;
  }

  private getDeleteCode(): string {
    const modelName = pascalCase(this.config.model);
    const modelInstanceName = camelCase(modelName);
    const ownerChecks = [];
    if (this.ownerVerifiedFields.length) {
      for (let i = this.ownerVerifiedFields.length; i--; ) {
        ownerChecks.push(`result.${this.ownerVerifiedFields} !== authUser.id`);
      }
    }

    let deleteFileCode = [];

    if (this.filesFields.length) {
      this.controllerFile.addImport(["LogLevel"], "@vesta/core");
      deleteFileCode = ["\n\t\tconst filesToBeDeleted = [];", `const baseDirectory = \`\${this.config.dir.upload}/${modelInstanceName}\`;`];
      for (const field of this.filesFields) {
        // if (field.type === FieldType.List) {
        //   deleteFileCode.push(`if (${modelInstanceName}.${field.name}) {
        //     for (let i = ${modelInstanceName}.${field.name}.length; i--; ) {
        //         filesToBeDeleted.push(\'\${baseDirectory}/\${${modelInstanceName}.${field.name}[i]}\');
        //     }
        // }`);
        // } else {
        // tslint:disable-next-line:max-line-length
        deleteFileCode.push(`filesToBeDeleted.push(\`\${baseDirectory}/\${${modelInstanceName}.${field.name}}\`);`);
        // }
      }
      deleteFileCode.push(`for (let i = filesToBeDeleted.length; i--;) {
            try {
                await FileUploader.checkAndDeleteFile(filesToBeDeleted[i]);
            } catch (error) {
                req.log(LogLevel.Warning, error.message, "remove${modelName}", "${modelName}Controller");
            }
        }`);
    }
    if (deleteFileCode.length) {
      deleteFileCode.unshift(`const ${modelInstanceName} = new ${modelName}(result);`);
    }
    const ownerCheckCode = ownerChecks.length
      ? `
        if (!isAdmin && (!result || ${ownerChecks.join(" || ")})) {
            throw new DatabaseError(Err.Type.DBNoRecord, null);
        }`
      : `
        if (!result) {
            throw new DatabaseError(Err.Type.DBNoRecord, null);
        }`;
    return `${this.getAuthUserCode()}const id = this.retrieveId(req);
        const result = await this.db.${modelInstanceName}.findOne({ where: { id } });${ownerCheckCode}
        ${deleteFileCode.join("\n\t\t")}
        await this.db.${modelInstanceName}.delete({ where: { id } });
        res.json({ items: [{ id }] });`;
  }

  private getUploadCode(): string {
    // todo add conf & owner
    this.controllerFile.addImport(["FileUploader"], genRelativePath(this.path, "src/helpers/FileUploader"));
    let code = "";
    const updateCode = [];
    if (this.filesFields.length === 1) {
      const field = this.filesFields[0];
      updateCode.push(`${field.name}: upl.${field.name} as string`);
      code = `const oldFileName = ${this.model.instanceName}.${field.name};
        if (oldFileName) {
            await FileUploader.checkAndDeleteFile(\`\${destDirectory}/\${oldFileName}\`);
        }`;
    } else {
      code = `const delList: Array<Promise<string>> = [];`;
      for (const field of this.filesFields) {
        const oldName = `old${pascalCase(field.name)}`;
        code += `
        if (upl.${field.name}) {
            const ${oldName} = ${this.model.instanceName}.${field.name};
            delList.push(FileUploader.checkAndDeleteFile(\`\${destDirectory}/\${${oldName}}\`));
        }`;
        updateCode.push(`${field.name}: upl.${field.name} as string`);
      }
      code += `
        await Promise.all(delList);`;
    }
    return `const id = this.retrieveId(req);
        const destDirectory = \`\${this.config.dir.upload}/${this.model.instanceName}\`;
        const result = await this.db.${this.model.instanceName}.findOne({ where: { id } });
        if (!result) {
            throw new Err(Err.Type.DBNoRecord, null);
        }
        const ${this.model.instanceName} = new ${this.model.className}(result);
        const uploader = new FileUploader<${this.model.interfaceName}>(true);
        await uploader.parse(req);
        const upl = await uploader.upload(destDirectory);
        ${code}
        const uResult = await this.db.${this.model.instanceName}.update({ where: { id }, data: { ${updateCode.join(", ")} } });
        ${this.getConfFieldRemovingCode(true, "uResult")}
        res.json({ items: [uResult] });`;
  }
}
