import { Field, FieldType } from "@vesta/core";
import { writeFileSync } from "fs-extra";
import { genRelativePath, isRelative, saveCodeToFile } from "../../util/FsUtil";
import { Log } from "../../util/Log";
import { getFieldMeta, parseModel } from "../../util/Model";
import { pascalCase } from "../../util/StringUtil";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";
import { IFieldMeta } from "../FieldGen";
import { Vesta } from "../Vesta";

interface IDetailFieldData {
  code: string;
  details: string;
}

export function genDetails(config: IComponentGenConfig) {
  const model = parseModel(config.model);
  const schema = model.module.schema;
  const fileName = `${model.className}Detail`;
  const file = new TsFileGen(fileName);
  const method = file.addMethod(fileName);
  const writtenOnce: any = {};

  method.shouldExport = true;
  method.returnType = "ReactElement";
  // imports
  file.addImport(["React"], "react", true);
  file.addImport(["ReactElement", "useEffect", "useState"], "react");
  file.addImport(["RouteComponentProps"], "react-router-dom");
  file.addImport(["ComponentProps", "StyledDataTableWrapper", "StyledDataTable"], "@vesta/components");
  file.addImport([model.interfaceName, model.className], "cmn/models");
  file.addImport(["Culture"], "@vesta/culture");
  file.addImport([`fetch${model.className}`], "./service");
  // params
  const params = file.addInterface(`${model.className}Params`);
  params.addProperty({ name: "id", type: "string" });

  // props
  const props = file.addInterface(`${fileName}Props`);
  props.setParentClass(`ComponentProps, RouteComponentProps<${params.name}>`);
  method.addParameter({ name: "props", type: props.name });

  const { details: fields, code } = getDetailsData();
  // render method
  method.appendContent(`
  const tr = Culture.getDictionary().translate;
  const [${model.instanceName}, set${model.className}] = useState<${model.interfaceName}>(null);

  useEffect(() => {
    const id = +props.match.params.id;
    if (!id) { return; }
    fetch${model.className}(id).then(set${model.className});
  }, [props.match.params.id]);

  if (!${model.instanceName}) { return null; }${code}

  return (
    <StyledDataTableWrapper>
      <StyledDataTable>
        <table className="details-table">
          <thead>
            <tr>
              <th colSpan={2}>{tr("title_record_detail", tr("${model.className.toLowerCase()}"), ${model.instanceName}.id)}</th>
            </tr>
          </thead>
          <tbody>
            ${fields}
            </tbody>
        </table>
      </StyledDataTable>
    </StyledDataTableWrapper>
  );`);

  // generate file
  saveCodeToFile(`${config.path}/${fileName}.tsx`, file.generate());

  function getDetailsData(): IDetailFieldData {
    const allFields = schema.getFields();
    const columns = [];
    const codes = [];
    for (let i = 0, il = allFields.length; i < il; ++i) {
      const fieldData = getFieldData(schema.name, allFields[i]);
      if (fieldData) {
        if (fieldData.details) {
          columns.push(fieldData.details);
        }
        if (fieldData.code) {
          codes.push(fieldData.code);
        }
      }
    }
    return {
      code: codes.length ? `\n\t${codes.join("\n\t")}` : "",
      details: columns.length ? columns.join("\n\t\t\t\t") : "",
    };
  }

  function getFieldData(modelName: string, field: Field): IDetailFieldData {
    const fieldName = field.name;
    if (fieldName === "id") {
      return null as IDetailFieldData;
    }

    const fieldMeta: IFieldMeta = getFieldMeta(modelName, fieldName);
    const appDir = Vesta.directories.app;

    let details = "";
    let fieldCode = "";
    let value = "";

    switch (field.type) {
      case FieldType.String:
      case FieldType.Text:
      case FieldType.Tel:
      case FieldType.EMail:
      case FieldType.URL:
      case FieldType.Number:
      case FieldType.Integer:
      case FieldType.Float:
        value = `${model.instanceName}.${fieldName}`;
        break;
      case FieldType.Password:
        break;
      case FieldType.File:
        file.addImport(["getFileUrl"], genRelativePath(config.path, `${appDir}/util`));
        fieldCode = `const ${model.instanceName}${pascalCase(fieldName)} = getFileUrl(\`${model.instanceName}/\${${model.instanceName}.${fieldName}}\`);`;
        value = `<img src={${model.instanceName}${pascalCase(fieldName)}} alt="${model.instanceName}" />`;
        break;
      case FieldType.Timestamp:
        if (!writtenOnce.dateTime) {
          writtenOnce.dateTime = true;
          fieldCode = `const dateTime = Culture.getDateTimeInstance();
        const dateTimeFormat = Culture.getLocale().defaultDateFormat;`;
        }
        value = `${model.instanceName}${pascalCase(fieldName)}`;
        fieldCode += `
        dateTime.setTime(${model.instanceName}.${fieldName});
        const ${value} = dateTime.format(dateTimeFormat);`;
        break;
      case FieldType.Boolean:
        value = `tr(${model.instanceName}.${fieldName} ? "yes" : "no")`;
        break;
      case FieldType.Enum:
        if (!fieldMeta.enum) {
          break;
        }
        const enumOptionsName = `${fieldName}Options`;
        if (fieldMeta.enum.name) {
          const enumName = fieldMeta.enum.name;
          const options = fieldMeta.enum.options.map((option, index) => `[${option}]: tr("enum_${option.split(".")[1].toLowerCase()}")`);
          fieldCode = `const ${enumOptionsName} = { ${options.join(", ")} };`;
          value = `${enumOptionsName}[${model.instanceName}.${fieldName}]`;
          // import enum from model file OR the path in meta
          if (fieldMeta.enum.path) {
            if (isRelative(fieldMeta.enum.path)) {
              file.addImport([enumName], genRelativePath(config.path, fieldMeta.enum.path || `${Vesta.directories.model}/${model.className}`));
            } else {
              file.addImport([enumName], fieldMeta.enum.path);
            }
          } else {
            file.addImport([enumName], genRelativePath(config.path, `${Vesta.directories.model}/${model.className}`));
          }
        } else {
          file.addImport(["getReadableOptions"], "@vesta/components");
          fieldCode = `const ${enumOptionsName} = getReadableOptions(${model.className}, "${fieldName}");`;
          value = `${enumOptionsName}[${model.instanceName}.${fieldName}]`;
        }
        break;
      case FieldType.Relation:
        // if (fieldMeta.relation) {
        //   switch (field.relation.type) {
        //     case RelationType.One2Many:
        //     case RelationType.Many2Many:
        //       // const schema: Schema = props.relation.model.schema;
        //       // console.log(schema);
        //       break;
        //   }
        // }
        break;
      // case FieldType.List:
      //   break;
      // case FieldType.Object:
      //   Log.warning(`Unsupported field type for ${fieldName}`);
      //   break;
      default:
        Log.error(`Unknown field type for ${fieldName} of type ${field.type}`);
    }
    if (value) {
      details = `
      <tr>
        <th>{tr("fld_${fieldName.toLowerCase()}")}</th>
        <td>{${value}}</td>
      </tr>`;
    }
    return { details, code: fieldCode };
  }
}
