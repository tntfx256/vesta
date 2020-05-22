import { Field, FieldType } from "@vesta/core";
import { camelCase } from "lodash";
import { genRelativePath, isRelative, saveCodeToFile } from "src/util/FsUtil";
import { getFieldMeta, getFieldsByType, hasFieldOfType, parseModel } from "../../util/Model";
import { pascalCase, plural } from "../../util/StringUtil";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";
import { IFieldMeta } from "../FieldGen";

interface IColumnFieldData {
  code: string;
  column: string;
}

export function genService(config: IComponentGenConfig) {
  const model = parseModel(config.model);
  const file = new TsFileGen("service");
  const fileFields = getFieldsByType(config.model, FieldType.File);
  const relationalFields = getFieldsByType(config.model, FieldType.Relation);

  //   import statements
  file.addImport(["React"], "react", true);
  file.addImport(["getCrud"], "services/Crud");
  file.addImport(["getAccount"], "services/Account");
  file.addImport(["Violation", "ValidationMessages", "ErrorMessages", "QueryOption"], "@vesta/core");
  file.addImport(["getValidationMessages", "getErrorMessages", "Column"], "@vesta/components");
  file.addImport(["Culture"], "@vesta/culture");
  file.addImport(["Access"], "@vesta/services");
  file.addImport(["DataTableOperations"], "components/general/DataTableOperations");
  file.addImport([model.interfaceName, model.className], "cmn/models");

  // const
  file.addMixin(
    `
    const edge = "${model.instanceName}";
    let access: Access;
    let columns: Column<${model.interfaceName}>[];
    let validationMessages: ValidationMessages<${model.interfaceName}>;
  `,
    TsFileGen.CodeLocation.AfterImport
  );

  getErrors();
  getColumns();
  fetchSingle();
  fetchCount();
  fetchAll();
  fetchRelations();
  save();
  remove();

  // save file
  saveCodeToFile(`${config.path}/service.tsx`, file.generate());

  function getErrors() {
    const errorMethod = file.addMethod("getErrors");
    errorMethod.shouldExport = true;
    errorMethod.returnType = `ErrorMessages<${model.interfaceName}>`;
    errorMethod.addParameter({ name: "violations", type: `Violation<${model.interfaceName}>` });
    errorMethod.appendContent(`
      if(!validationMessages) {
        validationMessages = getValidationMessages(${model.className});
      }
      return getErrorMessages(validationMessages, violations);
    `);
  }

  function getColumns() {
    const columnsMethod = file.addMethod(`getColumns`);
    columnsMethod.shouldExport = true;
    columnsMethod.addParameter({ name: "reload", type: "()=>void" });
    columnsMethod.returnType = `Column<${model.interfaceName}>[]`;
    const dateTime = hasFieldOfType(model.className, FieldType.Timestamp) ? `const dateTime = Culture.getDateTimeInstance();` : "";
    columnsMethod.appendContent(`if(!columns){
    const tr = Culture.getDictionary().translate;${dateTime}
    if (!access) {
      access = getAccount().getAccessList("role");
    }
    
    const onDelete = async (id: number) => {
      const isDeleted = await delete${model.className}(id);
      if (isDeleted) {
        reload();
      }
    };
    `);
    const column = getColumnsData();
    columnsMethod.appendContent(`
    columns = [${column}
      {
        render: (r: ${model.interfaceName}) => <DataTableOperations path="${model.instanceName}" id={r.id} access={access} onDelete={onDelete} />,
        title: tr("operations"),
      },
    ];
  }
  return columns;`);

    function getColumnsData(): string {
      const columns = [];
      for (const field of model.module.schema.getFields()) {
        const column = getFieldData(field);
        if (column) {
          columns.push(column);
        }
      }
      return columns.length ? `\n${columns.join(`,\n`)},` : "";
    }

    function getFieldData(field: Field): string {
      const fieldName = field.name;
      const fieldMeta: IFieldMeta = getFieldMeta(model.className, fieldName);
      if (!fieldMeta.list) {
        return null;
      }
      let columnCode = "";
      let hasValue = true;
      let render = null;
      let isRenderInline = true;
      switch (field.type) {
        case FieldType.Text:
        case FieldType.Password:
        case FieldType.File:
        case FieldType.Relation:
          // case FieldType.List:
          // case FieldType.Object:
          hasValue = false;
          break;
        // case FieldType.String:
        // case FieldType.Tel:
        // case FieldType.EMail:
        // case FieldType.URL:
        // case FieldType.Number:
        // case FieldType.Integer:
        // case FieldType.Float:
        //     break;
        case FieldType.Timestamp:
          isRenderInline = false;
          render = `dateTime.setTime(r.${fieldName});
              return dateTime.format("Y/m/d");`;
          break;
        case FieldType.Boolean:
          render = `tr(r.${fieldName} ? "yes" : "no")`;
          break;
        case FieldType.Enum:
          if (!fieldMeta.enum) {
            break;
          }
          const enumOptionsName = `${fieldName}Options`;
          if (fieldMeta.enum.name) {
            const enumName = fieldMeta.enum.name;
            const options = fieldMeta.enum.options.map((option, index) => `[${option}]: tr("enum_${option.split(".")[1].toLowerCase()}")`);
            columnsMethod.appendContent(`const ${enumOptionsName} = { ${options.join(", ")} };`);
            if (fieldMeta.enum.path) {
              if (isRelative(fieldMeta.enum.path)) {
                file.addImport([enumName], fieldMeta.enum.path ? genRelativePath(config.path, fieldMeta.enum.path) : "cmn/models");
              } else {
                file.addImport([enumName], fieldMeta.enum.path);
              }
            } else {
              file.addImport([enumName], "cmn/models");
            }
          } else {
            file.addImport(["getFormOptions"], "@vesta/components");
            columnsMethod.appendContent(`const ${enumOptionsName} = getFormOptions(${model.className}, "${fieldName}")`);
          }
          render = `tr(${enumOptionsName}[r.${fieldName}])`;
          break;
      }
      if (hasValue) {
        if (render) {
          columnCode = isRenderInline
            ? `{ title: tr("fld_${fieldName.toLowerCase()}"), render: (r: ${model.interfaceName}) => ${render} }`
            : `{
          title: tr("fld_${fieldName.toLowerCase()}"),
          render: (r: ${model.interfaceName}) => {
              ${render}
          }
      }`;
        } else {
          columnCode = `{ name: "${fieldName}", title: tr("fld_${fieldName.toLowerCase()}") }`;
        }
      }
      return columnCode;
    }
  }

  function fetchSingle() {
    const fetchMethod = file.addMethod(`fetch${model.className}`);
    fetchMethod.isAsync = true;
    fetchMethod.shouldExport = true;
    fetchMethod.addParameter({ name: "id", type: "number" });
    fetchMethod.addParameter({ name: "isForm", type: "boolean", isOptional: true });
    fetchMethod.returnType = `Promise<${model.interfaceName}>`;
    // convert relational data array to number array for multichoice
    let postFetchCode = "";
    const fetchedResultName = model.instanceName;
    const relationsCode = [];

    for (const field of relationalFields) {
      const meta: IFieldMeta = getFieldMeta(config.model, field.name);
      if (!meta.form || !meta.relation || !meta.relation.model) {
        continue;
      }
      const relationalModelName = meta.relation.model;

      relationsCode.push(
        field.areManyOf
          ? `${fetchedResultName}.${field.name} = (${fetchedResultName}.${field.name} as I${relationalModelName}[]).map(r => r.id);`
          : `${fetchedResultName}.${field.name} = (${fetchedResultName}.${field.name} as I${relationalModelName}).id;`
      );
    }

    const filesCode = [];

    for (const field of fileFields) {
      filesCode.push(`if (${fetchedResultName}.${field.name}) {
                ${fetchedResultName}.${field.name} = getFileUrl(\`${model.instanceName}/\${${fetchedResultName}.${field.name}}\`);
            }`);
    }

    if (filesCode.length || relationsCode.length) {
      if (filesCode.length) {
        file.addImport(["getFileUrl"], "utils/helpers");
      }
      postFetchCode = `if (${fetchedResultName}) {
          if(isForm){
            ${relationsCode.join("\n")}
          }
          ${filesCode.join("\n")};
        }`;
    }
    fetchMethod.appendContent(`
      const resource = getCrud<${model.interfaceName}>(edge);
      const ${fetchedResultName} = await resource.fetch(id);
      ${postFetchCode}
      return ${model.instanceName};
    `);
  }

  function fetchCount() {
    const fetchCountMethod = file.addMethod(`fetch${plural(model.className)}Count`);
    fetchCountMethod.shouldExport = true;
    fetchCountMethod.addParameter({ name: "queryOption", type: `QueryOption<${model.interfaceName}>` });
    fetchCountMethod.returnType = `Promise<number>`;
    fetchCountMethod.appendContent(`
    const resource = getCrud<${model.interfaceName}>(edge);
    return resource.fetchCount(queryOption);
    `);
  }

  function fetchAll() {
    const fetchAllMethod = file.addMethod(`fetch${plural(model.className)}`);
    fetchAllMethod.shouldExport = true;
    fetchAllMethod.addParameter({ name: "queryOption", type: `QueryOption<${model.interfaceName}>` });
    fetchAllMethod.returnType = `Promise<${model.interfaceName}[]>`;
    fetchAllMethod.appendContent(`
    const resource = getCrud<${model.interfaceName}>(edge);
    return resource.fetchAll(queryOption);
    `);
  }

  function save() {
    const saveMethod = file.addMethod(`save${model.className}`);
    saveMethod.shouldExport = true;
    saveMethod.returnType = `Promise<${model.interfaceName}>`;
    saveMethod.addParameter({ name: "data", type: `Partial<${model.interfaceName}>` });
    let fileCode = "";
    if (fileFields.length) {
      fileCode = `let hasFile = false;
          const ${model.instanceName}Files: Partial<${model.interfaceName}> = {};`;
      for (const field of fileFields) {
        const fieldName = field.name;
        fileCode += `
          if (${model.instanceName}.${fieldName} && ${model.instanceName}.${fieldName} instanceof File) {
              ${model.instanceName}Files.${fieldName} = ${model.instanceName}.${fieldName};
              delete ${model.instanceName}Model.${fieldName};
              hasFile = true;
          }`;
      }
    }
    saveMethod.appendContent(`
      const ${model.instanceName} = new ${model.className}(data);${fileCode}
      const resource = getCrud<${model.interfaceName}>(edge);
      return resource.submit(${model.instanceName}${fileFields.length ? `, hasFile ? ${model.instanceName}Files : null` : ""});
    `);
  }

  function fetchRelations() {
    // fetch relations
    if (!relationalFields) {
      return;
    }
    for (const field of relationalFields) {
      const meta: IFieldMeta = getFieldMeta(config.model, field.name);
      if (!meta.form || !meta.relation || !meta.relation.model) {
        continue;
      }
      const methodPostfix = pascalCase(field.name);
      const relationalModelName = meta.relation.model;
      const relationalModelInstanceName = camelCase(relationalModelName);
      if (meta.relation.showAllOptions) {
        const relationFetchMethod = file.addMethod(`fetch${methodPostfix}`);
        relationFetchMethod.shouldExport = true;
        relationFetchMethod.returnType = `Promise<I${relationalModelName}${field.areManyOf ? "[]" : ""}>`;
        // relationFetchMethod.isAsync = true;
        file.addImport([`I${relationalModelName}`], "cmn/models");
        relationFetchMethod.appendContent(`
          const resource = getCrud<I${relationalModelName}>("${relationalModelInstanceName}");
          return resource.fetchAll();
          `);
      }
    }
  }

  function remove() {
    const deleteMethod = file.addMethod(`delete${model.className}`);
    deleteMethod.shouldExport = true;
    deleteMethod.returnType = "Promise<boolean>";
    deleteMethod.addParameter({ name: "id", type: "number" });
    deleteMethod.appendContent(`
      const resource = getCrud<${model.interfaceName}>(edge);
      return resource.remove(id);
      `);
  }
}
