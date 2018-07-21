import { Field, FieldType, IFieldProperties, Schema } from "@vesta/core";
import { writeFileSync } from "fs";
import { genRelativePath, mkdir } from "../../../../util/FsUtil";
import { camelCase, plural } from "../../../../util/StringUtil";
import { TsFileGen } from "../../../core/TSFileGen";
import { Vesta } from "../../../file/Vesta";
import { IFieldMeta } from "../../FieldGen";
import { ModelGen } from "../../ModelGen";
import { ICrudComponentGenConfig } from "../ComponentGen";

interface IColumnFieldData {
    code: string;
    column: string;
}

export class ListComponentGen {
    private className: string;
    private schema: Schema;
    private writtenOnce: any = {};

    constructor(private config: ICrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}List`;
        mkdir(config.path);
        const model = ModelGen.getModel(config.model);
        this.schema = model.schema;
    }

    public generate() {
        const code = this.genCrudListComponent();
        // generate file
        writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }

    private genCrudListComponent() {
        const model = this.config.modelConfig;
        const path = this.config.path;
        const stateName = camelCase(this.config.name);
        const pluralModel = plural(model.instanceName);
        const appDir = Vesta.getInstance().isNewV2() ? "src/app" : "src/client/app";
        // ts file
        const listFile = new TsFileGen(this.className);
        // imports
        listFile.addImport(["React"], "react", true);
        listFile.addImport(["Link"], "react-router-dom");
        listFile.addImport(["PageComponent", "IPageComponentProps", "FetchAll"],
            genRelativePath(path, `${appDir}/components/PageComponent`));
        listFile.addImport([`I${model.originalClassName}`],
            genRelativePath(path, `${appDir}/cmn/models/${model.originalClassName}`));
        listFile.addImport(["IColumn", "DataTable", "IDataTableQueryOption"],
            genRelativePath(path, `${appDir}/components/general/DataTable`));
        listFile.addImport(["IDeleteResult"],
            genRelativePath(path, `${appDir}/medium`));
        listFile.addImport(["IAccess"],
            genRelativePath(path, `${appDir}/service/AuthService`));
        listFile.addImport(["DataTableOperations"],
            genRelativePath(path, `${appDir}/components/general/DataTableOperations`));
        // params
        listFile.addInterface(`I${this.className}Params`);
        // props
        const listProps = listFile.addInterface(`I${this.className}Props`);
        listProps.setParentClass(`IPageComponentProps<I${this.className}Params>`);
        listProps.addProperty({ name: pluralModel, type: `Array<${model.interfaceName}>` });
        listProps.addProperty({ name: "access", type: "IAccess" });
        listProps.addProperty({ name: "onFetch", type: `FetchAll<${model.interfaceName}>` });
        listProps.addProperty({ name: "queryOption", type: `IDataTableQueryOption<${model.interfaceName}>` });
        // state
        const listState = listFile.addInterface(`I${this.className}State`);
        listState.addProperty({ name: pluralModel, type: `Array<I${model.originalClassName}>` });
        // class
        const listClass = listFile.addClass(this.className);
        listClass.setParentClass(`PageComponent<I${this.className}Props, I${this.className}State>`);
        listClass.addProperty({ name: "columns", type: `Array<IColumn<I${model.originalClassName}>>`, access: "private" });
        const { column, code } = this.getColumnsData(listFile);
        // constructor
        listClass.setConstructor();
        listClass.getConstructor().addParameter({ name: "props", type: `${this.className}Props` });
        let dateTimeCode = "";
        if (this.hasFieldOfType(FieldType.Timestamp)) {
            listFile.addImport(["Culture"], genRelativePath(this.config.path, `${appDir}/medium`));
            dateTimeCode = `\n\t\tconst dateTime = Culture.getDateTimeInstance();
        const dateTimeFormat = Culture.getLocale().defaultDateFormat;`;
        }
        listClass.getConstructor().setContent(`super(props);
        this.state = {${pluralModel}: []};${dateTimeCode}
        this.columns = [${column}
            {
                render: r => <DataTableOperations access={props.access} id={r.id} onDelete={this.onDelete} path="${stateName}"/>,
                title: this.tr('operations'),
            }
        ];`);
        // fetch
        listClass.addMethod("componentDidMount").setContent(`this.props.onFetch(this.props.queryOption);`);
        // delete action
        const delMethod = listClass.addMethod("onDelete", "private");
        delMethod.addParameter({ name: "id" });
        delMethod.setAsArrowFunction(true);
        delMethod.setContent(`this.api.del<IDeleteResult>(\`${model.instanceName}/\${id}\`)
            .then((response) => {
                this.notif.success(this.tr("info_delete_record"));
                this.props.onFetch(this.props.queryOption);
            })
            .catch((error) => {
                this.notif.error(error.message);
            });`);
        // render method
        listClass.addMethod("render").setContent(`const { queryOption, onFetch, ${pluralModel} } = this.props;${code}

        return (
            <div className="crud-page">
                <DataTable columns={this.columns} records={${pluralModel}} queryOption={queryOption}
                    fetch={onFetch} pagination={true}/>
            </div>
        );`);
        return listFile.generate();
        // <h1>${plural(model.originalClassName)}'s List</h1>
    }

    private getColumnsData(listFile: TsFileGen): IColumnFieldData {
        const fields = this.schema.getFields();
        const columns = [];
        const codes = [];
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            const fieldData = this.getFieldData(listFile, this.schema.name, fields[fieldsName[i]]);
            if (!fieldData) { continue; }
            if (fieldData.column) {
                columns.push(fieldData.column);
            }
            if (fieldData.code) {
                codes.push(fieldData.code);
            }
        }
        return {
            code: codes.length ? `\n\t\t${codes.join("\n\t\t")}` : "",
            column: columns.length ? `\n\t\t\t${columns.join(",\n\t\t\t")},` : "",
        };
    }

    private getFieldData(file: TsFileGen, model: string, field: Field): IColumnFieldData {
        const fieldName = field.fieldName;
        const props: IFieldProperties = field.properties;
        const modelMeta: IFieldMeta = ModelGen.getFieldMeta(model, fieldName);
        if (!modelMeta.list) { return null as IColumnFieldData; }
        let column = "";
        const code = "";
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
                    const listClass = file.getClass();
                    const enumName = camelCase(modelMeta.enum.options[0].split(".")[0]) + "Options";
                    const options = modelMeta.enum.options.map((option, index) => `${props.enum[index]}: this.tr('enum_${option.split(".")[1].toLowerCase()}')`);
                    // code = `const ${enumName} = {${options.join(', ')}};`;
                    render = `this.tr(this.${enumName}[r.${fieldName}])`;
                    listClass.addProperty({ name: enumName, access: "private", defaultValue: `{${options.join(", ")}}` });
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
        return { column, code };
    }

    private hasFieldOfType(type: FieldType) {
        const fields = this.schema.getFields();
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            if (fields[fieldsName[i]].properties.type === type) { return true; }
        }
        return false;
    }
}
