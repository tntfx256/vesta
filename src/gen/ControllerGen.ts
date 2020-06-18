import { Field, FieldType } from "@vesta/core";
import { camelCase } from "lodash";
import { join } from "path";
import { ArgParser } from "../util/ArgParser";
import { genRelativePath, mkdir, saveCodeToFile } from "../util/FsUtil";
import { Log } from "../util/Log";
import {
  getConfidentialFields,
  getFieldMeta,
  getFieldsByListType,
  getFieldsByType,
  getOwnerVerifiedFields,
  parseModel,
  reduceFieldsByType,
} from "../util/Model";
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
    this.routeMethod = this.controllerClass.addMethod({ name: "route", access: Access.Public, sort: false });
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
    const { interfaceName, className } = this.model;
    this.filesFields = [
      ...getFieldsByType(this.config.model, FieldType.File),
      ...getFieldsByListType(this.config.model, FieldType.File),
    ];
    this.relationsFields = getFieldsByType(this.config.model, FieldType.Relation);
    this.ownerVerifiedFields = getOwnerVerifiedFields(this.config.model);
    this.confidentialFields = getConfidentialFields(this.config.model);

    this.controllerFile.addImport(["Err", "DatabaseError", "ValidationError"], "@vesta/core");
    this.controllerFile.addImport([className], genRelativePath(this.path, `src/cmn/models`));
    this.controllerFile.addImport(["AclAction"], "@vesta/services");
    let acl = this.routingPath.replace(/\/+/g, ".");
    acl = acl[0] === "." ? acl.slice(1) : acl;
    const middleWares = ` this.checkAcl("${acl}", __ACTION__),`;
    // count operation
    let methodName = `get${className}Count`;
    let methodBasedMiddleWares = middleWares.replace("__ACTION__", "AclAction.Read");
    this.addResponseMethod(methodName).appendContent(this.getCountCode());
    // tslint:disable-next-line:max-line-length
    this.routeMethod.appendContent(
      `router.get("${this.routingPath}/count",${methodBasedMiddleWares} this.wrap(this.${methodName}));`
    );
    //
    methodName = "get" + className;
    methodBasedMiddleWares = middleWares.replace("__ACTION__", "AclAction.Read");
    this.addResponseMethod(methodName).appendContent(this.getQueryCode(true));
    // tslint:disable-next-line:max-line-length
    this.routeMethod.appendContent(
      `router.get("${this.routingPath}/:id",${methodBasedMiddleWares} this.wrap(this.${methodName}));`
    );
    //
    methodName = "get" + plural(className);
    this.addResponseMethod(methodName).appendContent(this.getQueryCode(false));
    // tslint:disable-next-line:max-line-length
    this.routeMethod.appendContent(
      `router.get("${this.routingPath}",${methodBasedMiddleWares} this.wrap(this.${methodName}));`
    );
    //
    methodName = "add" + className;
    methodBasedMiddleWares = middleWares.replace("__ACTION__", "AclAction.Add");
    this.addResponseMethod(methodName).appendContent(this.getInsertCode());
    // tslint:disable-next-line:max-line-length
    this.routeMethod.appendContent(
      `router.post("${this.routingPath}",${methodBasedMiddleWares} this.wrap(this.${methodName}));`
    );
    //
    methodName = "update" + className;
    methodBasedMiddleWares = middleWares.replace("__ACTION__", "AclAction.Edit");
    this.addResponseMethod(methodName).appendContent(this.getUpdateCode());
    // tslint:disable-next-line:max-line-length
    this.routeMethod.appendContent(
      `router.put("${this.routingPath}",${methodBasedMiddleWares} this.wrap(this.${methodName}));`
    );
    //
    methodName = "remove" + className;
    methodBasedMiddleWares = middleWares.replace("__ACTION__", "AclAction.Delete");
    this.addResponseMethod(methodName).appendContent(this.getDeleteCode());
    // tslint:disable-next-line:max-line-length
    this.routeMethod.appendContent(
      `router.delete("${this.routingPath}/:id",${methodBasedMiddleWares} this.wrap(this.${methodName}));`
    );
    // file upload
    if (this.filesFields.length) {
      methodName = "upload";
      methodBasedMiddleWares = middleWares.replace("__ACTION__", "AclAction.Edit");
      this.addResponseMethod(methodName).appendContent(this.getUploadCode());
      // tslint:disable-next-line:max-line-length
      this.routeMethod.appendContent(
        `router.post("${this.routingPath}/file/:id",${methodBasedMiddleWares} this.wrap(this.${methodName}));`
      );
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
      ? `const authUser = this.getAuthUser(req);
        const isAdmin = this.isAdmin(authUser, this.getSourceApp(req));`
      : "";
  }

  private transFormResult(singleRecord?: boolean, variableName = "result"): string {
    const { className } = this.model;
    const codes = [];
    const index = singleRecord ? "." : "[i].";

    // CONFIDENTIALITY
    if (this.confidentialFields.length) {
      for (const confField of this.confidentialFields) {
        codes.push(`delete ${variableName}${index}${confField};`);
      }
    }
    // checking confidentiality of relations
    codes.push(
      ...reduceFieldsByType(
        className,
        FieldType.Relation
      )((acc, fieldName) => {
        const meta = getFieldMeta(this.config.model, fieldName);
        const relConfFields = getConfidentialFields(meta.relation.model);
        if (relConfFields.length) {
          this.controllerFile.addImport([`I${meta.relation.model}`], genRelativePath(this.path, "src/cmn/models"));
          for (let j = relConfFields.length; j--; ) {
            return `delete (${variableName}${index}${fieldName} as I${meta.relation.model}).${relConfFields[j]};`;
          }
        }
      })
    );

    // LIST & OBJECTS
    codes.push(
      ...reduceFieldsByType(
        className,
        FieldType.List,
        FieldType.Object
      )((acc, fieldName, { type }) => {
        const emptyItem = type === FieldType.List ? "[]" : "{}";
        return `${variableName}${index}${fieldName} = ${variableName}${index}${fieldName}? JSON.parse(${variableName}${index}${fieldName}): ${emptyItem}`;
      })
    );

    // FINAL CODE
    let code = "";
    if (codes.length) {
      if (singleRecord) {
        code = `\n${codes.join("\n")}`;
      } else {
        code = `\nfor (let i = ${variableName}.length; i--;) {
            ${codes.join("\n")}
        }`;
      }
    }
    return code;
  }

  private getQueryCodeForSingleInstance(): string {
    const { instanceName } = this.model;
    const ownerChecks = [];
    for (let i = this.ownerVerifiedFields.length; i--; ) {
      const meta = getFieldMeta(this.config.model, this.ownerVerifiedFields[i]);
      if (meta.relation) {
        const extPath = meta.relation.path ? `/${meta.relation.path}` : "";
        this.controllerFile.addImport(
          [`I${meta.relation.model}`],
          genRelativePath(this.path, `src/cmn/models${extPath}/${meta.relation.model}`)
        );
        // tslint:disable-next-line:max-line-length
        ownerChecks.push(`(result.${this.ownerVerifiedFields} as I${meta.relation.model}).id !== authUser.id`);
      } else {
        ownerChecks.push(`result.${this.ownerVerifiedFields} !== authUser.id`);
      }
    }

    // todo: check list and object for relations

    const ownerCheckCode = ownerChecks.length ? ` || (!isAdmin && (${ownerChecks.join(" || ")}))` : "";
    const relationFields = this.relationsFields.length
      ? `, include: {${this.relationsFields.map((r) => `${r.name as string}: true`).join(", ")} }`
      : "";
    return `${this.getAuthUserCode()}const id = this.retrieveId(req);
        const result = await this.db.${instanceName}.findOne({ where: { id }${relationFields} });
        if (!result${ownerCheckCode}) {
            throw new DatabaseError(Err.Type.DBNoRecord, null);
        }${this.transFormResult(true)}
        res.json({ items: [result] });`;
  }

  private getQueryCodeForMultiInstance(): string {
    const { instanceName } = this.model;
    const ownerQueries = [];
    for (let i = this.ownerVerifiedFields.length; i--; ) {
      ownerQueries.push(`${this.ownerVerifiedFields[i]}: authUser.id`);
    }
    const ownerQueriesCode = ownerQueries.length
      ? `if (!isAdmin) {
            query.filter = {AND: [{${ownerQueries.join(", ")}}, query.filter];
        }`
      : "";
    // this.controllerFile.addImport([`FindMany${className}Args`], "@prisma/client");
    return `${this.getAuthUserCode()}const query = this.parseQuery(req.query);${ownerQueriesCode}
        const result = await this.db.${instanceName}.findMany(query);${this.transFormResult()}
        res.json({ items: result });`;
  }

  private getCountCode(): string {
    const { instanceName } = this.model;
    return `const query = this.parseQuery(req.query, true);
        const result = await this.db.${instanceName}.count(query);
        res.json({ items: [], total: result });`;
  }

  private getQueryCode(isSingle: boolean): string {
    return isSingle ? this.getQueryCodeForSingleInstance() : this.getQueryCodeForMultiInstance();
  }

  private getInsertCode(): string {
    const { className, instanceName } = this.model;
    const simpleFields =
      `...${instanceName}.getValues("` +
      this.getSimpleFields()
        .map((f) => f.name)
        .filter((f) => f !== "id")
        .join('","') +
      `")`;
    const convertedFields = this.getNeedConvertionFields()
      .map((f) => {
        const fieldName = String(f.name);
        const defValue = f.type === FieldType.List ? '"[]"' : '"{}"';
        return `${fieldName}: ${instanceName}.${fieldName}?JSON.stringify(${instanceName}.${fieldName}):${defValue}`;
      })
      .join(",");
    const filesCode = this.filesFields
      .map((f) => `${f.name as string}: ${f.type === FieldType.List ? '"[]"' : '""'}`)
      .join(", ");
    const relationCode = this.relationsFields
      .map((field: Field) => {
        const fieldName = String(field.name);
        const checkVal = field.required ? "" : `${instanceName}.${fieldName}?`;
        const noVal = field.required ? "" : field.isOneOf ? `: null` : `: []`;
        return field.isOneOf
          ? `${fieldName}: { connect: ${checkVal}{ id: ${instanceName}.${fieldName} as number }${noVal} }`
          : `${fieldName}: { connect: ${checkVal}(${instanceName}.${fieldName} as number[]).map(id=> ({ id }))${noVal} }`;
      })
      .join(", ");

    const ownerAssigns = [];
    for (let i = this.ownerVerifiedFields.length; i--; ) {
      ownerAssigns.push(`${instanceName}.${this.ownerVerifiedFields[i]} = authUser.id;`);
    }
    const ownerAssignCode = ownerAssigns.length
      ? `\nif (!isAdmin) {
            ${ownerAssigns.join("\n")}
        }`
      : "";
    const inserData = [simpleFields, convertedFields, filesCode, relationCode].filter(Boolean).join(",");
    return `${this.getAuthUserCode()}const ${instanceName} = new ${className}(req.body);${ownerAssignCode}
        const violations = ${instanceName}.validate();
        if (violations) {
            throw new ValidationError(violations);
        }
        const result = await this.db.${instanceName}.create({ data: { ${inserData} } });${this.transFormResult(true)}
        res.json({ items: [result] });`;
  }

  private getUpdateCode(): string {
    const { instanceName, className } = this.model;
    const simpleFields =
      `...${instanceName}.getValues("` +
      this.getSimpleFields()
        .map((f) => f.name)
        .filter((f) => f !== "id")
        .join('","') +
      `")`;
    const ownerChecks = [];
    const ownerInlineChecks = [];
    for (let i = this.ownerVerifiedFields.length; i--; ) {
      ownerChecks.push(`${instanceName}.${this.ownerVerifiedFields[i]} = authUser.id;`);
      // check owner of record after finding the record based on recordId
      ownerInlineChecks.push(`${instanceName}.${this.ownerVerifiedFields[i]} !== authUser.id`);
    }
    const ownerCheckCode = ownerChecks.length
      ? `
    if (!isAdmin) {
      ${ownerChecks.join("\n")}
    }`
      : "";
    const ownerCheckInlineCode = ownerInlineChecks.length ? ` || (!isAdmin && (${ownerInlineChecks.join(" || ")}))` : "";
    const relationCode = [];

    for (const field of this.relationsFields) {
      const fieldName = String(field.name);
      if (field.isOneOf) {
        relationCode.push(
          `${fieldName}: ${instanceName}.${fieldName} ? { connect: { id: ${instanceName}.${fieldName} as number } }: undefined`
        );
      } else if (field.areManyOf) {
        relationCode.push(
          `${fieldName}: ${instanceName}.${fieldName} ? { set: (${instanceName}.${fieldName} as number[]).map(id=> ({ id })) }: undefined`
        );
      }
    }

    const dataCode = [simpleFields, relationCode].filter(Boolean).join(",");
    return `${this.getAuthUserCode()}const ${instanceName} = new ${className}(req.body);${ownerCheckCode}
        const violations = ${instanceName}.validate();
        if (violations) {
            throw new ValidationError(violations);
        }
        const result = await this.db.${instanceName}.findOne({ where: { id: ${instanceName}.id } });
        if (!result${ownerCheckInlineCode}) {
            throw new DatabaseError(Err.Type.DBNoRecord, null);
        }
        
        const uResult = await this.db.${instanceName}.update({ where: { id: ${instanceName}.id }, data: { ${dataCode} } });
    ${this.transFormResult(true, "uResult")}
        res.json({ items: [uResult] });`;
  }

  private getDeleteCode(): string {
    const { instanceName } = this.model;
    const ownerChecks = [];
    if (this.ownerVerifiedFields.length) {
      for (let i = this.ownerVerifiedFields.length; i--; ) {
        ownerChecks.push(`result.${this.ownerVerifiedFields} !== authUser.id`);
      }
    }

    const deleteFileCode = [];

    if (this.filesFields.length) {
      this.controllerFile.addImport(["deleteFiles"], genRelativePath(this.path, "src/utils/FileUploader"));
      const fileFields = [];
      for (const field of this.filesFields) {
        const fieldName = String(field.name);
        fileFields.push(
          `${fieldName}: ${
            field.type === FieldType.File
              ? `${instanceName}.${fieldName}`
              : `${instanceName}.${fieldName} ? JSON.parse(${instanceName}.${fieldName}) : []`
          }`
        );
      }
      deleteFileCode.push(`await deleteFiles({${fileFields.join(",")}}, \`\${this.config.dir.upload}/${instanceName}\`)`);
    }
    const ownerCheckCode = ownerChecks.length
      ? `
        if (!isAdmin && (!${instanceName} || ${ownerChecks.join(" || ")})) {
            throw new DatabaseError(Err.Type.DBNoRecord, null);
        }`
      : `
        if (!${instanceName}) {
            throw new DatabaseError(Err.Type.DBNoRecord, null);
        }`;
    return `${this.getAuthUserCode()}const id = this.retrieveId(req);
        const ${instanceName} = await this.db.${instanceName}.findOne({ where: { id } });${ownerCheckCode}
        ${deleteFileCode.join("\n")}
        await this.db.${instanceName}.delete({ where: { id } });
        res.json({ items: [{ id }] });`;
  }

  private getUploadCode(): string {
    const { instanceName, className } = this.model;
    this.controllerFile.addImport(["saveFiles"], genRelativePath(this.path, "src/utils/FileUploader"));

    const ownerChecks = [];
    const ownerInlineChecks = [];
    for (let i = this.ownerVerifiedFields.length; i--; ) {
      ownerChecks.push(`${instanceName}.${this.ownerVerifiedFields[i]} = authUser.id;`);
      // check owner of record after finding the record based on recordId
      ownerInlineChecks.push(`${instanceName}.${this.ownerVerifiedFields[i]} !== authUser.id`);
    }
    const ownerCheckCode = ownerChecks.length
      ? `
    if (!isAdmin) {
      ${ownerChecks.join("\n")}
    }`
      : "";
    const ownerCheckInlineCode = ownerInlineChecks.length ? ` || (!isAdmin && (${ownerInlineChecks.join(" || ")}))` : "";

    const selectFields = [];
    const fromDB = [];
    const toDB = [];
    for (const field of this.filesFields) {
      const fieldName = String(field.name);
      selectFields.push(fieldName);
      const ext = field.type === FieldType.List ? `? JSON.parse(result.${fieldName}) : []` : "";
      fromDB.push(`${fieldName}: result.${fieldName}${ext}`);
      toDB.push(
        field.type === FieldType.List
          ? `${fieldName}: JSON.stringify(files.${fieldName})`
          : `${fieldName}: files.${fieldName} as string`
      );
    }
    const selectCode = selectFields.map((f) => `${f}: true`).join(",");

    return `const id = this.retrieveId(req);${ownerCheckCode}
        const result = await this.db.${instanceName}.findOne({ where: { id }, select: {${selectCode}} });
        if (!result${ownerCheckInlineCode}) {
            throw new Err(Err.Type.DBNoRecord, null);
        }
        const files = await saveFiles(req, new ${className}({${fromDB.join(
      ","
    )}}),\`\${this.config.dir.upload}/${instanceName}\`);
        const uResult = await this.db.${instanceName}.update({ where: { id }, data: {${toDB.join(
      ","
    )}} });${this.transFormResult(true, "uResult")}
        res.json({ items: [uResult] });`;
  }

  private getSimpleFields(): Field[] {
    const { module } = this.model;
    return module.schema
      .getFields()
      .filter((f) => ![FieldType.File, FieldType.List, FieldType.Object, FieldType.Relation].includes(f.type));
  }

  private getNeedConvertionFields(): Field[] {
    const { module } = this.model;
    return module.schema
      .getFields()
      .filter((f) => [FieldType.List, FieldType.Object].includes(f.type) && f.listOf !== FieldType.File);
  }
}
