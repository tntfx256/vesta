import { Field, FieldType } from "@vesta/core";
import { camelCase } from "lodash";
import { genRelativePath, isRelative, saveCodeToFile } from "src/util/FsUtil";
import {
  getFieldMeta,
  getFieldsByType,
  hasFieldOfType,
  parseModel,
  getFieldForFormSelect,
  getFieldsByListType,
} from "../../util/Model";
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
  const listFileFields = getFieldsByListType(config.model, FieldType.File);
  const relationalFields = getFieldsByType(config.model, FieldType.Relation);
  const enumFields = getFieldsByType(config.model, FieldType.Enum);
  const enumListFields = getFieldsByListType(config.model, FieldType.Enum);

  //   import statements
  file.addImport(["React"], "react", true);
  file.addImport(["getResource"], "services/Resource");
  file.addImport(["getAccount"], "services/Account");
  file.addImport(["Violation", "ValidationMessages", "ErrorMessages", "Query"], "@vesta/core");
  file.addImport(["getValidationMessages", "getErrorMessages", "Column"], "@vesta/components");
  file.addImport(["Culture"], "@vesta/culture");
  file.addImport(["Access"], "@vesta/services");
  file.addImport(["DataTableOperations"], "components/general/DataTableOperations");
  file.addImport([model.interfaceName, model.className], "cmn/models");
  if (enumFields.length || enumListFields.length) {
    file.addImport(["FormOption"], "@vesta/components");
  }

  let optionsType =
    enumFields.length || enumListFields.length
      ? `
  type ${model.className}Options = "${enumFields
          .concat(enumListFields)
          .map((f) => f.name)
          .join(`"|"`)}";
  type ${model.className}OptionsStorage = { [key in ${model.className}Options]?: FormOption[] };

  const optionsStorage: ${model.className}OptionsStorage = {}; 
  `
      : "";

  // const
  file.addMixin(
    `
    const edge = "${model.instanceName}";

    let access: Access;
    let columns: Column<${model.interfaceName}>[];
    let validationMessages: ValidationMessages<${model.interfaceName}>;
    ${optionsType}
  `,
    TsFileGen.CodeLocation.AfterImport
  );

  getErrors();
  getOptions();
  getColumns();
  fetchSingle();
  fetchCount();
  fetchAll();
  save();
  remove();
  fetchRelations();

  // save file
  saveCodeToFile(`${config.path}/${model.className}Service.tsx`, file.generate());

  function getErrors() {
    const method = file.addMethod("getErrors");
    method.shouldExport = true;
    method.returnType = `ErrorMessages<${model.interfaceName}>`;
    method.addParameter({ name: "violations", type: `Violation<${model.interfaceName}>` });
    method.appendContent(`
      if(!validationMessages) {
        validationMessages = getValidationMessages(${model.className});
      }
      return getErrorMessages(validationMessages, violations);
    `);
  }

  function getOptions() {
    if (!enumFields.length && !enumListFields.length) {
      return;
    }
    const method = file.addMethod("getOptions");
    method.shouldExport = true;
    method.returnType = "FormOption[]";
    method.addParameter({ name: "field", type: `${model.className}Options` });
    const actualEnumOptionsCode = [];
    for (const field of enumFields) {
      const code = extractEnumOptions(field);
      if (code) {
        actualEnumOptionsCode.push(code);
      }
    }
    for (const field of enumListFields) {
      const code = extractEnumOptions(field);
      if (code) {
        actualEnumOptionsCode.push(code);
      }
    }
    // boolean fields, not needed
    method.appendContent(`
    if (!optionsStorage[field]) {
      ${actualEnumOptionsCode.length ? " else {" : ""}optionsStorage[field] = getFormOptions(${model.className}, field);${
      actualEnumOptionsCode.length ? "\n}" : ""
    }
    }
    return optionsStorage[field];
    `);
    function extractEnumOptions(field: Field): string {
      const fieldName = String(field.name);
      const fieldMeta = getFieldMeta(model.className, fieldName);

      if (fieldMeta.enum.name) {
        const enumName = fieldMeta.enum.name;
        const options = fieldMeta.enum.options.map(
          (option, index) => `[${option}]: tr("enum_${option.split(".")[1].toLowerCase()}")`
        );

        if (fieldMeta.enum.path) {
          if (isRelative(fieldMeta.enum.path)) {
            file.addImport(
              [enumName],
              fieldMeta.enum.path ? genRelativePath(config.path, fieldMeta.enum.path) : "cmn/models"
            );
          } else {
            file.addImport([enumName], fieldMeta.enum.path);
          }
        } else {
          file.addImport([enumName], "cmn/models");
        }
        return [
          actualEnumOptionsCode.length ? "else " : "",
          `if(field === "${fieldName}"){
            optionsStorage[field] = { ${options.join(", ")} }
          }`,
        ].join(" ");
      }
      file.addImport(["getFormOptions"], "@vesta/components");
      return "";
    }
  }

  function getColumns() {
    const method = file.addMethod(`getColumns`);
    method.shouldExport = true;
    method.addParameter({ name: "reload", type: "Function" });
    method.returnType = `Column<${model.interfaceName}>[]`;
    const dateTime = hasFieldOfType(model.className, FieldType.Timestamp)
      ? `const dateTime = Culture.getDateTimeInstance();`
      : "";
    method.appendContent(`if(!columns){
    const tr = Culture.getDictionary().translate;${dateTime}
    if (!access) {
      access = getAccount().getAccessList("${model.instanceName}");
    }
    
    const onDelete = async (id: number) => {
      const isDeleted = await delete${model.className}(id);
      if (isDeleted) {
        reload();
      }
    };
    `);
    const column = getColumnsData();
    method.appendContent(`
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
      const fieldName = String(field.name);
      const fieldMeta: IFieldMeta = getFieldMeta(model.className, fieldName);
      if (!fieldMeta.list || field.name === "id") {
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
        case FieldType.List:
        case FieldType.Object:
          hasValue = false;
          break;
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
          method.appendContent(`const ${enumOptionsName} = getOptions("${fieldName}")`);
          render = `tr(${enumOptionsName}[r.${fieldName}])`;
          break;
      }
      if (hasValue) {
        if (render) {
          columnCode = isRenderInline
            ? `{ title: tr("fld_${fieldName.toLowerCase()}"), render: (r: ${model.interfaceName}) => ${render}${getSortable(
                field
              )} }`
            : `{
          title: tr("fld_${fieldName.toLowerCase()}"),
          render: (r: ${model.interfaceName}) => {
              ${render}
          }${getSortable(field)}
      }`;
        } else {
          columnCode = `{ name: "${fieldName}", title: tr("fld_${fieldName.toLowerCase()}")${getSortable(field)} }`;
        }
      }
      return columnCode;
    }

    function getSortable(field: Field): string {
      const type = field.type;
      if (field.name === "id") {
        return "";
      }
      return [
        FieldType.Enum,
        FieldType.Float,
        FieldType.Integer,
        FieldType.Number,
        FieldType.String,
        FieldType.Timestamp,
      ].includes(type)
        ? ", sortable: true"
        : "";
    }
  }

  function fetchSingle() {
    const method = file.addMethod(`fetch${model.className}`);
    method.isAsync = true;
    method.shouldExport = true;
    method.addParameter({ name: "id", type: "number" });
    // if (relationalFields.length) {
    //   method.addParameter({ name: "transform", type: "boolean", isOptional: true });
    // }
    method.returnType = `Promise<${model.interfaceName}>`;
    // convert relational data array to number array for multichoice
    let postFetchCode = "";
    const fetchedResultName = model.instanceName;
    // const relationsCode = [];

    // for (const field of relationalFields) {
    //   const fieldName = String(field.name);
    //   const meta: IFieldMeta = getFieldMeta(config.model, fieldName);
    //   if (!meta.form || !meta.relation || !meta.relation.model) {
    //     continue;
    //   }
    //   const relationalModelName = meta.relation.model;
    //   file.addImport([`I${relationalModelName}`], "cmn/models");
    //   relationsCode.push(
    //     field.areManyOf
    //       ? `${fetchedResultName}.${fieldName} = (${fetchedResultName}.${fieldName} as I${relationalModelName}[]).map(r => r.id);`
    //       : `${fetchedResultName}.${fieldName} = (${fetchedResultName}.${fieldName} as I${relationalModelName}).id;`
    //   );
    // }

    const filesCode = [];

    for (const field of fileFields) {
      const fieldName = String(field.name);
      filesCode.push(`if (${fetchedResultName}.${fieldName}) {
                ${fetchedResultName}.${fieldName} = getFileUrl(\`${model.instanceName}/\${${fetchedResultName}.${fieldName}}\`);
            }`);
    }
    for (const field of listFileFields) {
      const fieldName = String(field.name);
      filesCode.push(`if (${fetchedResultName}.${fieldName}) {
                ${fetchedResultName}.${fieldName} = ${fetchedResultName}.${fieldName}.map((f: string)=>getFileUrl(\`${model.instanceName}/\${f}\`));
            }`);
    }

    if (filesCode.length) {
      if (filesCode.length) {
        file.addImport(["getFileUrl"], "utils/helpers");
      }
      // const relationTransformCode = relationsCode.length
      //   ? `if(transform){
      //   ${relationsCode.join("\n")}
      // }`
      //   : "";
      postFetchCode = `if (${fetchedResultName}) {
          ${filesCode.join("\n")};
        }`;
    }
    method.appendContent(`
      const resource = getResource<${model.interfaceName}>(edge);
      const ${fetchedResultName} = await resource.fetch(id);${postFetchCode}
      return ${model.instanceName};
    `);
  }

  function fetchCount() {
    const fetchCountMethod = file.addMethod(`fetch${plural(model.className)}Count`);
    fetchCountMethod.shouldExport = true;
    fetchCountMethod.addParameter({ name: "query", type: `Query<${model.interfaceName}>` });
    fetchCountMethod.returnType = `Promise<number>`;
    fetchCountMethod.appendContent(`
    return getResource<${model.interfaceName}>(edge).fetchCount(query);
    `);
  }

  function fetchAll() {
    const fetchAllMethod = file.addMethod(`fetch${plural(model.className)}`);
    fetchAllMethod.shouldExport = true;
    fetchAllMethod.addParameter({ name: "query", type: `Query<${model.interfaceName}>` });
    fetchAllMethod.returnType = `Promise<${model.interfaceName}[]>`;
    fetchAllMethod.appendContent(`
    return getResource<${model.interfaceName}>(edge).fetchAll(query);
    `);
  }

  function save() {
    const saveMethod = file.addMethod(`save${model.className}`);
    saveMethod.shouldExport = true;
    saveMethod.returnType = `Promise<${model.interfaceName}>`;
    saveMethod.addParameter({ name: "data", type: `Partial<${model.interfaceName}>` });
    let fileCode = "";
    const duplicate = [];
    // if (fileFields.length || listFileFields.length) {
    //   fileCode = `let hasFile = false;
    //       const ${model.instanceName}Files: Partial<${model.interfaceName}> = {};`;

    //   if (fileFields.length) {
    //     for (const field of fileFields) {
    //       const fieldName = String(field.name);
    //       fileCode += `
    //       if (data.${fieldName} instanceof File) {
    //           ${model.instanceName}Files.${fieldName} = data.${fieldName};
    //           delete ${model.instanceName}.${fieldName};
    //           hasFile = true;
    //       }`;
    //     }
    //   }
    //   if (listFileFields.length) {
    //     for (const field of listFileFields) {
    //       const fieldName = String(field.name);
    //       duplicate.push(`${model.instanceName}.${fieldName} = [];`);
    //       fileCode += `
    //     if(data.${fieldName}){
    //       for(let i=0, il=data.${fieldName}.length; i<il; i+=1) {
    //         if (data.${fieldName}[i] instanceof File) {
    //           hasFile = true;
    //           if (!${model.instanceName}Files.${fieldName}) {
    //             ${model.instanceName}Files.${fieldName} = [];
    //           }
    //           ${model.instanceName}Files.${fieldName}.push(data.${fieldName}[i]);
    //         }else{
    //           ${model.instanceName}.${fieldName}.push(data.${fieldName}[i]);
    //         }
    //       }
    //     }`;
    //     }
    //   }
    // }
    saveMethod.appendContent(`
      const ${model.instanceName} = new ${model.className}(data);${duplicate.join("\n")}${fileCode}
      return getResource<${model.interfaceName}>(edge).submit(${model.instanceName});`);
    // ${fileFields.length ? `, hasFile ? ${model.instanceName}Files : null` : ""});
  }

  function fetchRelations() {
    // fetch relations
    if (!relationalFields) {
      return;
    }
    for (const field of relationalFields) {
      const fieldName = String(field.name);
      const meta: IFieldMeta = getFieldMeta(config.model, fieldName);
      if (!meta.form || !meta.relation || !meta.relation.model) {
        continue;
      }
      const methodPostfix = field.areManyOf ? pascalCase(fieldName) : plural(pascalCase(fieldName));
      const relationalModelName = meta.relation.model;
      const relationalModelInstanceName = camelCase(relationalModelName);
      if (meta.relation.showAllOptions) {
        const method = file.addMethod(`fetch${methodPostfix}`);
        method.shouldExport = true;
        method.returnType = `Promise<I${relationalModelName}[]>`;
        // relationFetchMethod.isAsync = true;
        file.addImport([`I${relationalModelName}`], "cmn/models");
        method.appendContent(`
          return getResource<I${relationalModelName}>("${relationalModelInstanceName}").fetchAll();
          `);
      } else {
        // searching
        const method = file.addMethod(`search${methodPostfix}`);
        method.addParameter({ name: "term", type: "string" });
        method.shouldExport = true;
        method.returnType = `Promise<I${relationalModelName}[]>`;
        const searchableField = getFieldForFormSelect(relationalModelName);
        file.addImport([`I${relationalModelName}`], "cmn/models");
        file.addImport(["getApi"], "services/Api");
        method.appendContent(`return getApi()
        .get("${relationalModelInstanceName}", { filter: { ${searchableField}: { contains: term } }, size: 10, fields: ["id", "${searchableField}"] })
        .then(({ items }) => items)
        .catch(()=>  []);`);
      }
    }
  }

  function remove() {
    const deleteMethod = file.addMethod(`delete${model.className}`);
    deleteMethod.shouldExport = true;
    deleteMethod.returnType = "Promise<boolean>";
    deleteMethod.addParameter({ name: "id", type: "number" });
    deleteMethod.appendContent(`
      return getResource<${model.interfaceName}>(edge).remove(id);
      `);
  }
}
