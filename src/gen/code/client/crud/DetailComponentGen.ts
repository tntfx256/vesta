import * as fs from "fs";
import {CrudComponentGenConfig} from "../ComponentGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {genRelativePath, mkdir} from "../../../../util/FsUtil";
import {camelCase, fcUpper} from "../../../../util/StringUtil";
import {Field, FieldType, IFieldProperties, RelationType, Schema} from "@vesta/core";
import {Log} from "../../../../util/Log";
import {ModelGen} from "../../ModelGen";
import {IFieldMeta} from "../../FieldGen";

interface IDetailFieldData {
    field: string;
    code: string;
}

export class DetailComponentGen {
    private className: string;
    private schema: Schema;

    constructor(private config: CrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}Detail`;
        mkdir(config.path);
        let model = ModelGen.getModel(config.model);
        this.schema = model.schema;
    }

    private genCrudDetailComponent() {
        let model = this.config.modelConfig;
        let path = this.config.path;
        let stateName = camelCase(this.config.name);
        // ts file
        let detailFile = new TsFileGen(this.className);
        // imports
        detailFile.addImport('React', 'react');
        detailFile.addImport('{FetchById, PageComponent, PageComponentProps, PageComponentState}', genRelativePath(path, 'src/client/app/components/PageComponent'));
        detailFile.addImport(`{I${model.originalClassName}}`, genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        // params
        detailFile.addInterface(`${this.className}Params`).addProperty({name: 'id', type: 'number'});
        let detailProps = detailFile.addInterface(`${this.className}Props`);
        detailProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        detailProps.addProperty({name: model.instanceName, type: model.interfaceName});
        detailProps.addProperty({name: 'fetch', type: `FetchById<${model.interfaceName}>`});
        let detailState = detailFile.addInterface(`${this.className}State`);
        detailState.setParentClass('PageComponentState');
        // class
        let detailClass = detailFile.addClass(this.className);
        detailClass.setParentClass(`PageComponent<${this.className}Props, ${this.className}State>`);
        // fetch
        detailClass.addMethod('componentDidMount').setContent(`this.props.fetch(+this.props.match.params.id)
            .then(${model.instanceName} => this.setState({${model.instanceName}}));`);
        const {field, code} = this.getDetailsData(detailFile);
        // render method
        detailClass.addMethod('render').setContent(`let ${model.instanceName} = this.props.${model.instanceName};
        if (!${model.instanceName}) return null;
        const tr = this.tr.translate;${code}
        return (
            <div className="page ${model.instanceName}Detail-component">
                <table className="spec-table">
                    <thead>
                    <tr>
                        <th colSpan={2}>${model.originalClassName} #{${model.instanceName}.id}</th>
                    </tr>
                    </thead>
                    <tbody>
                    ${field}
                    </tbody>
                </table>
            </div>);`);
        return detailFile.generate();
    }

    private getDetailsData(listFile: TsFileGen): IDetailFieldData {
        const fields = this.schema.getFields();
        let columns = [];
        let codes = [];
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            let fieldData = this.getFieldData(listFile, this.schema.name, fields[fieldsName[i]]);
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
            field: columns.length ? columns.join('\n\t\t\t\t') : '',
            code: codes.length ? `\n\t\t${codes.join('\n\t\t')}` : ''
        };
    }

    private getFieldData(formFile: TsFileGen, modelName: string, field: Field): IDetailFieldData {
        let fieldName = field.fieldName;
        if (fieldName == 'id') return <IDetailFieldData>null;
        const props: IFieldProperties = field.properties;
        let modelMeta: IFieldMeta = ModelGen.getFieldMeta(modelName, fieldName);
        const label = fcUpper(fieldName);
        const instanceName = camelCase(modelName);
        let details = '';
        let code = '';
        let value = '';
        let imports = [];
        switch (props.type) {
            case FieldType.String:
            case FieldType.Text:
            case FieldType.Password:
            case FieldType.Tel:
            case FieldType.EMail:
            case FieldType.URL:
            case FieldType.Number:
            case FieldType.Integer:
            case FieldType.Float:
                value = `${instanceName}.${fieldName}`;
                break;
            case FieldType.File:
                break;
            case FieldType.Timestamp:
                break;
            case FieldType.Boolean:
                value = `tr(r.${fieldName} ? 'yes' : 'no')`;
                break;
            case FieldType.Enum:
                imports.push('FormSelect');
                if (modelMeta.enum) {
                    if (modelMeta.enum) {
                        let enumName = camelCase(modelMeta.enum.options[0].split('.')[0]) + 'Options';
                        let options = modelMeta.enum.options.map((option, index) => `${props.enum[index]}: tr('enum_${option.split('.')[1].toLowerCase()}')`);
                        code = `const ${enumName} = {${options.join(', ')}};`;
                        value = `${enumName}[${instanceName}.${fieldName}]`;
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
                Log.error(`Unknown field type for ${fieldName} of type ${props.type}`)
        }
        if (value) {
            details = `<tr>\n\t\t\t\t\t\t<td>{tr('fld_${fieldName.toLowerCase()}')}</td>\n\t\t\t\t\t\t<td>{${value}}</td>\n\t\t\t\t\t</tr>`;
        }
        return {field: details, code}
    }

    public generate() {
        let code = this.genCrudDetailComponent();
        // generate file
        fs.writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }
}