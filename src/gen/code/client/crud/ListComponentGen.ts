import * as fs from "fs";
import {CrudComponentGenConfig} from "../ComponentGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {genRelativePath, mkdir} from "../../../../util/FsUtil";
import {camelCase, plural} from "../../../../util/StringUtil";
import {Field, FieldType, IFieldProperties, Schema} from "@vesta/core";
import {ModelGen} from "../../ModelGen";
import {IFieldMeta} from "../../FieldGen";

interface IColumnFieldData {
    column: string;
    code: string;
}

export class ListComponentGen {
    private className: string;
    private schema: Schema;
    private writtenOnce: any = {};

    constructor(private config: CrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}List`;
        mkdir(config.path);
        let model = ModelGen.getModel(config.model);
        this.schema = model.schema;

    }

    private genCrudListComponent() {
        let model = this.config.modelConfig;
        let path = this.config.path;
        let stateName = camelCase(this.config.name);
        let pluralModel = plural(model.instanceName);
        // ts file
        let listFile = new TsFileGen(this.className);
        // imports
        listFile.addImport(['React'], 'react', true);
        listFile.addImport(['Link'], 'react-router-dom');
        listFile.addImport(['PageComponent', 'PageComponentProps', 'PageComponentState'], genRelativePath(path, 'src/client/app/components/PageComponent'));
        listFile.addImport([`I${model.originalClassName}`], genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        listFile.addImport(['Column', 'DataTable', 'IDataTableQueryOption'], genRelativePath(path, 'src/client/app/components/general/DataTable'));
        listFile.addImport(['IDeleteResult'], genRelativePath(path, 'src/client/app/cmn/core/ICRUDResult'));
        listFile.addImport(['IAccess'], genRelativePath(path, 'src/client/app/service/AuthService'));
        listFile.addImport(['DataTableOperations'], genRelativePath(path, 'src/client/app/components/general/DataTableOperations'));
        // params
        listFile.addInterface(`${this.className}Params`);
        let listProps = listFile.addInterface(`${this.className}Props`);
        // props
        listProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        listProps.addProperty({name: pluralModel, type: `Array<${model.interfaceName}>`});
        listProps.addProperty({name: 'access', type: 'IAccess'});
        listProps.addProperty({
            name: 'onFetch',
            type: `(queryOption: IDataTableQueryOption<${model.interfaceName}>) => void`
        });
        listProps.addProperty({
            name: 'queryOption',
            type: `IDataTableQueryOption<${model.interfaceName}>`
        });
        // state
        let listState = listFile.addInterface(`${this.className}State`);
        listState.setParentClass('PageComponentState');
        listState.addProperty({name: pluralModel, type: `Array<I${model.originalClassName}>`});
        // class
        let listClass = listFile.addClass(this.className);
        listClass.setParentClass(`PageComponent<${this.className}Props, ${this.className}State>`);
        // constructor
        listClass.setConstructor();
        listClass.getConstructor().addParameter({name: 'props', type: `${this.className}Props`});
        listClass.getConstructor().setContent(`super(props);
        this.state = {${pluralModel}: []};`);
        // fetch
        listClass.addMethod('componentDidMount').setContent(`this.props.onFetch(this.props.queryOption);`);
        // delete action
        let delMethod = listClass.addMethod('onDelete');
        delMethod.addParameter({name: 'id'});
        delMethod.setAsArrowFunction(true);
        delMethod.setContent(`this.api.del<IDeleteResult>('${model.instanceName}', id)
            .then(response => {
                this.notif.success(this.tr('info_delete_record', response.items[0]));
                this.props.onFetch(this.props.queryOption);
            })
            .catch(error => {
                this.notif.error(error.message);
            })`);
        // render method
        let {column, code} = this.getColumnsData(listFile);
        listClass.addMethod('render').setContent(`const {access, onFetch, ${pluralModel}} = this.props;${code}
        const columns: Array<Column<I${model.originalClassName}>> = [${column}
            {
                title: this.tr('operations'), 
                render: r => <DataTableOperations access={access} id={r.id} onDelete={this.onDelete} path="${stateName}"/>
            }
        ];
        return (
            <div className="crud-page">
                <DataTable queryOption={this.props.queryOption} columns={columns} records={${pluralModel}}
                           fetch={onFetch} pagination={true}/>
            </div>
        )`);
        return listFile.generate();
        // <h1>${plural(model.originalClassName)}'s List</h1>
    }

    private getColumnsData(listFile: TsFileGen): IColumnFieldData {
        const fields = this.schema.getFields();
        let columns = [];
        let codes = [];
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            let fieldData = this.getFieldData(listFile, this.schema.name, fields[fieldsName[i]]);
            if (!fieldData) continue;
            if (fieldData.column) {
                columns.push(fieldData.column);
            }
            if (fieldData.code) {
                codes.push(fieldData.code);
            }
        }
        return {
            column: columns.length ? `\n\t\t\t${columns.join(',\n\t\t\t')},` : '',
            code: codes.length ? `\n\t\t${codes.join('\n\t\t')}` : ''
        };
    }

    private getFieldData(file: TsFileGen, model: string, field: Field): IColumnFieldData {
        let fieldName = field.fieldName;
        const props: IFieldProperties = field.properties;
        let modelMeta: IFieldMeta = ModelGen.getFieldMeta(model, fieldName);
        if ('list' in modelMeta && !modelMeta.list) return <IColumnFieldData>null;
        let column = '';
        let code = '';
        let hasValue = true;
        let render = null;
        let isRenderInline = true;
        switch (props.type) {
            case FieldType.Text:
            case FieldType.Password:
            case FieldType.File:
            case FieldType.Relation:
            case FieldType.List:
            case FieldType.Object:
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
                if (!this.writtenOnce.dateTime) {
                    this.writtenOnce.dateTime = true;
                    file.addImport(['Culture'], genRelativePath(this.config.path, 'src/client/app/cmn/core/Culture'));
                    code = `const dateTime = Culture.getDateTimeInstance();
        const dateTimeFormat = Culture.getLocale().defaultDateFormat;`;
                }
                isRenderInline = false;
                render = `dateTime.setTime(r.date);
                    return dateTime.format(dateTimeFormat);`;
                break;
            case FieldType.Boolean:
                render = `this.tr(r.${fieldName} ? 'yes' : 'no')`;
                break;
            case FieldType.Enum:
                if (modelMeta.enum) {
                    let enumName = camelCase(modelMeta.enum.options[0].split('.')[0]) + 'Options';
                    let options = modelMeta.enum.options.map((option, index) => `${props.enum[index]}: this.tr('enum_${option.split('.')[1].toLowerCase()}')`);
                    code = `const ${enumName} = {${options.join(', ')}};`;
                    render = `this.tr(${enumName}[r.${fieldName}])`;
                }
                break;
        }
        if (hasValue) {
            if (render) {
                column = isRenderInline ? `{title: this.tr('fld_${fieldName}'), render: r => ${render}}` : `{
                title: this.tr('fld_${fieldName}'),
                render: r => {
                    ${render}
                }
            }`;
            } else {
                column = `{name: '${fieldName}', title: this.tr('fld_${fieldName}')}`;
            }
        }
        return {column, code};
    }

    public generate() {
        let code = this.genCrudListComponent();
        // generate file
        fs.writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }
}