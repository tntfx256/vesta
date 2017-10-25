import * as fs from "fs";
import {CrudComponentGenConfig} from "../ComponentGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {genRelativePath, mkdir} from "../../../../util/FsUtil";
import {camelCase, fcUpper, pascalCase, plural} from "../../../../util/StringUtil";
import {Field, FieldType, IFieldProperties, IModelFields, RelationType, Schema} from "@vesta/core";
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
    private relationalFields: IModelFields;

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
        detailFile.addImport(['React'], 'react', true);
        detailFile.addImport(['FetchById', 'PageComponent', 'PageComponentProps', 'PageComponentState'], genRelativePath(path, 'src/client/app/components/PageComponent'));
        detailFile.addImport([`I${model.originalClassName}`], genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        // params
        detailFile.addInterface(`${this.className}Params`).addProperty({name: 'id', type: 'number'});
        // props
        let detailProps = detailFile.addInterface(`${this.className}Props`);
        detailProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        detailProps.addProperty({name: 'fetch', type: `FetchById<${model.interfaceName}>`});
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                let meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                detailFile.addImport([`I${meta.relation.model}`], genRelativePath(path, `src/client/app/cmn/models/${meta.relation.model}`));
                detailProps.addProperty({
                    name: `${plural(fieldNames[i])}`,
                    type: `Array<I${meta.relation.model}>`
                });
            }
        }
        // state
        let detailState = detailFile.addInterface(`${this.className}State`);
        detailState.setParentClass('PageComponentState');
        detailState.addProperty({name: model.instanceName, type: model.interfaceName});
        // class
        let detailClass = detailFile.addClass(this.className);
        detailClass.setParentClass(`PageComponent<${this.className}Props, ${this.className}State>`);
        detailClass.getConstructor().addParameter({name: 'props', type: `${this.className}Props`});
        detailClass.getConstructor().setContent(`super(props);
        this.state = {${model.instanceName}: {}};`);
        // fetch
        detailClass.addMethod('componentDidMount').setContent(`this.props.fetch(+this.props.match.params.id)
            .then(${model.instanceName} => this.setState({${model.instanceName}}));`);
        const {field, code} = this.getDetailsData(detailFile);
        // render method
        detailClass.addMethod('render').setContent(`const ${model.instanceName} = this.state.${model.instanceName};
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
        let columns = [];
        let codes = [];
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            let fieldData = this.getFieldData(detailsFile, this.schema.name, fields[fieldsName[i]]);
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
            field: columns.length ? columns.join('\n\t\t\t\t\t') : '',
            code: codes.length ? `\n\t\t${codes.join('\n\t\t')}` : ''
        };
    }

    private getFieldData(detailsFile: TsFileGen, modelName: string, field: Field): IDetailFieldData {
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
                detailsFile.addImport(['Util'], genRelativePath(this.config.path, 'src/client/app/util/Util'));
                code = `const ${instanceName}${pascalCase(fieldName)} = Util.getFileUrl(\`${instanceName}/\${${instanceName}.${fieldName}}\`);`;
                value = `<img src={${instanceName}${pascalCase(fieldName)}}/>`;
                break;
            case FieldType.Timestamp:
                break;
            case FieldType.Boolean:
                value = `this.tr(${instanceName}.${fieldName} ? 'yes' : 'no')`;
                break;
            case FieldType.Enum:
                if (modelMeta.enum) {
                    if (modelMeta.enum) {
                        let enumName = camelCase(modelMeta.enum.options[0].split('.')[0]) + 'Options';
                        let options = modelMeta.enum.options.map((option, index) => `${props.enum[index]}: this.tr('enum_${option.split('.')[1].toLowerCase()}')`);
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
            details = `<tr>\n\t\t\t\t\t\t<td>{this.tr('fld_${fieldName.toLowerCase()}')}</td>\n\t\t\t\t\t\t<td>{${value}}</td>\n\t\t\t\t\t</tr>`;
        }
        return {field: details, code}
    }

    public generate() {
        this.relationalFields = ModelGen.getFieldsByType(this.config.model, FieldType.Relation);
        let code = this.genCrudDetailComponent();
        // generate file
        fs.writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }
}