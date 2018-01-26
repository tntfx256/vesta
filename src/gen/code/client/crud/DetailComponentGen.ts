import { Field, FieldType, IFieldProperties, RelationType, Schema } from "@vesta/core";
import { writeFileSync } from "fs";
import { genRelativePath, mkdir } from "../../../../util/FsUtil";
import { Log } from "../../../../util/Log";
import { camelCase, fcUpper, pascalCase } from "../../../../util/StringUtil";
import { TsFileGen } from "../../../core/TSFileGen";
import { IFieldMeta } from "../../FieldGen";
import { ModelGen } from "../../ModelGen";
import { ICrudComponentGenConfig } from "../ComponentGen";

interface IDetailFieldData {
    code: string;
    field: string;
}

export class DetailComponentGen {
    private className: string;
    private schema: Schema;
    private writtenOnce: any = {};

    constructor(private config: ICrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}Detail`;
        mkdir(config.path);
        const model = ModelGen.getModel(config.model);
        this.schema = model.schema;
    }

    public generate() {
        const code = this.genCrudDetailComponent();
        // generate file
        writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }

    private genCrudDetailComponent() {
        const model = this.config.modelConfig;
        const path = this.config.path;
        // ts file
        const detailFile = new TsFileGen(this.className);
        // imports
        detailFile.addImport(["React"], "react", true);
        detailFile.addImport(["FetchById", "PageComponent", "PageComponentProps"], genRelativePath(path, "src/client/app/components/PageComponent"));
        detailFile.addImport([`I${model.originalClassName}`], genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        // params
        detailFile.addInterface(`${this.className}Params`).addProperty({ name: "id", type: "number" });
        // props
        const detailProps = detailFile.addInterface(`${this.className}Props`);
        detailProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        detailProps.addProperty({ name: "onFetch", type: `FetchById<${model.interfaceName}>` });
        // state
        const detailState = detailFile.addInterface(`${this.className}State`);
        detailState.addProperty({ name: model.instanceName, type: model.interfaceName });
        // class
        const detailClass = detailFile.addClass(this.className);
        detailClass.setParentClass(`PageComponent<${this.className}Props, ${this.className}State>`);
        detailClass.getConstructor().addParameter({ name: "props", type: `${this.className}Props` });
        detailClass.getConstructor().setContent(`super(props);
        this.state = {${model.instanceName}: {}};`);
        // fetch
        detailClass.addMethod("componentDidMount").setContent(`this.props.onFetch(+this.props.match.params.id)
            .then(${model.instanceName} => this.setState({${model.instanceName}}));`);
        const { field, code } = this.getDetailsData(detailFile);
        // render method
        detailClass.addMethod("render").setContent(`const ${model.instanceName} = this.state.${model.instanceName};
        if (!${model.instanceName}) return null;${code}

        return (
            <div className="crud-page">
                <table className="details-table">
                    <thead>
                    <tr>
                        <th colSpan={2}>{this.tr('title_record_detail', this.tr('mdl_${model.originalClassName.toLowerCase()}'), ${model.instanceName}.id)}</th>
                    </tr>
                    </thead>
                    <tbody>
                    ${field}
                    </tbody>
                </table>
            </div>
        )`);
        return detailFile.generate();
    }

    private getDetailsData(detailsFile: TsFileGen): IDetailFieldData {
        const fields = this.schema.getFields();
        const columns = [];
        const codes = [];
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            const fieldData = this.getFieldData(detailsFile, this.schema.name, fields[fieldsName[i]]);
            if (fieldData) {
                if (fieldData.field) {
                    columns.push(fieldData.field);
                }
                if (fieldData.code) {
                    codes.push(fieldData.code);
                }
            }
        }
        return {
            code: codes.length ? `\n\t\t${codes.join("\n\t\t")}` : "",
            field: columns.length ? columns.join("\n\t\t\t\t\t") : "",
        };
    }

    private getFieldData(detailsFile: TsFileGen, modelName: string, field: Field): IDetailFieldData {
        const fieldName = field.fieldName;
        if (fieldName == "id") { return null as IDetailFieldData; }
        const props: IFieldProperties = field.properties;
        const modelMeta: IFieldMeta = ModelGen.getFieldMeta(modelName, fieldName);
        const label = fcUpper(fieldName);
        const instanceName = camelCase(modelName);
        let details = "";
        let code = "";
        let value = "";
        const imports = [];
        switch (props.type) {
            case FieldType.String:
            case FieldType.Text:
            case FieldType.Tel:
            case FieldType.EMail:
            case FieldType.URL:
            case FieldType.Number:
            case FieldType.Integer:
            case FieldType.Float:
                value = `${instanceName}.${fieldName}`;
                break;
            case FieldType.Password:
                break;
            case FieldType.File:
                detailsFile.addImport(["getFileUrl"], genRelativePath(this.config.path, "src/client/app/util/Util"));
                code = `const ${instanceName}${pascalCase(fieldName)} = getFileUrl(\`${instanceName}/\${${instanceName}.${fieldName}}\`);`;
                value = `<img src={${instanceName}${pascalCase(fieldName)}}/>`;
                break;
            case FieldType.Timestamp:
                if (!this.writtenOnce.dateTime) {
                    detailsFile.addImport(["Culture"], genRelativePath(this.config.path, "src/client/app/cmn/core/Culture"));
                    this.writtenOnce.dateTime = true;
                    code = `const dateTime = Culture.getDateTimeInstance();
        const dateTimeFormat = Culture.getLocale().defaultDateFormat;`;
                }
                value = `${instanceName}${pascalCase(fieldName)}`;
                code += `
        dateTime.setTime(${instanceName}.${fieldName});
        const ${value} = dateTime.format(dateTimeFormat);`;
                break;
            case FieldType.Boolean:
                value = `this.tr(${instanceName}.${fieldName} ? 'yes' : 'no')`;
                break;
            case FieldType.Enum:
                if (modelMeta.enum) {
                    if (modelMeta.enum) {
                        const detailsClass = detailsFile.getClass();
                        const enumName = camelCase(modelMeta.enum.options[0].split(".")[0]) + "Options";
                        const options = modelMeta.enum.options.map((option, index) => `${props.enum[index]}: this.tr('enum_${option.split(".")[1].toLowerCase()}')`);
                        // code = `const ${enumName} = ;`;
                        value = `this.${enumName}[${instanceName}.${fieldName}]`;
                        detailsClass.addProperty({
                            access: "private",
                            defaultValue: `{${options.join(", ")}}`,
                            name: enumName,
                        });
                    }
                }
                break;
            case FieldType.Relation:
                if (modelMeta.relation) {
                    switch (props.relation.type) {
                        case RelationType.One2Many:
                        case RelationType.Many2Many:
                            const schema: Schema = props.relation.model.schema;
                            // console.log(schema);
                            break;
                    }
                }
                break;
            case FieldType.List:
                break;
            case FieldType.Object:
                Log.warning(`Unsupported field type for ${fieldName}`);
                break;
            default:
                Log.error(`Unknown field type for ${fieldName} of type ${props.type}`);
        }
        if (value) {
            details = `<tr>\n\t\t\t\t\t\t<td>{this.tr('fld_${fieldName.toLowerCase()}')}</td>\n\t\t\t\t\t\t<td>{${value}}</td>\n\t\t\t\t\t</tr>`;
        }
        return { field: details, code };
    }
}
