import { Field, FieldType, IFieldProperties } from "@vesta/core";
import { writeFileSync } from "fs";
import { camelCase } from "lodash";
import { genRelativePath } from "../../util/FsUtil";
import { getFieldMeta, parseModel } from "../../util/Model";
import { pascalCase, plural, tab } from "../../util/StringUtil";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";
import { IFieldMeta } from "../FieldGen";
import { Vesta } from "../Vesta";

interface IColumnFieldData {
    code: string;
    column: string;
}

export function genList(config: IComponentGenConfig) {
    const model = parseModel(config.model);
    const fileName = `${model.className}List`;
    const schema = model.module.schema;
    const pluralModel = plural(model.instanceName);
    // ts file
    const file = new TsFileGen(fileName);
    const method = file.addMethod(fileName);
    method.isArrow = true;
    method.shouldExport = true;
    // imports
    file.addImport(["React"], "react", true);
    file.addImport(["ComponentType", "useState", "useEffect"], "react");
    file.addImport(["IComponentProps", "IColumn"], "@vesta/components");
    file.addImport(["IColumn", "DataTable", "IQueryOption"], "@vesta/components");
    file.addImport(["Culture"], "@vesta/culture");
    file.addImport([`I${model.className}`], genRelativePath(config.path, `${Vesta.directories.model}/${model.className}`));
    file.addImport(["DataTableOperations"], genRelativePath(config.path, `${Vesta.directories.components}/general/DataTableOperations`));
    file.addImport(["getAclInstance"], genRelativePath(config.path, `${Vesta.directories.app}/service/Acl`));
    file.addImport(["getCrud"], genRelativePath(config.path, `${Vesta.directories.app}/service/Crud`));
    // props
    const props = file.addInterface(`I${fileName}Props`);
    props.setParentClass(`IComponentProps`);
    method.methodType = `ComponentType<${props.name}>`;
    method.addParameter({ name: "props", type: props.name });
    const { column, code } = getColumnsData();

    method.appendContent(`
    const access = getAclInstance().getAccessList("${model.instanceName}");
    const tr = Culture.getDictionary().translate;
    const service = getCrud<${model.interfaceName}>("${model.instanceName}");
    const dateTime = Culture.getDateTimeInstance();
    const columns: Array<IColumn<${model.interfaceName}>> = [${column}
        {
            render: (r: ${model.interfaceName}) => <DataTableOperations path="${model.instanceName}" id={r.id} access={access} onDelete={onDelete} />,
            title: tr("operations"),
        },
    ];

    const [${pluralModel}, set${pascalCase(pluralModel)}] = useState<${model.interfaceName}[]>([]);
    const [queryOption, setQueryOption] = useState({});

    useEffect(() => onFetch(queryOption), []);
    ${code}
    return (
        <div className="crud-page">
            <DataTable queryOption={queryOption} columns={columns} records={${pluralModel}}
                onPagination={onFetch} pagination={true} />
        </div>
    );`);
    const fetch = method.addMethod("onFetch");
    fetch.addParameter({ name: "option", type: `IQueryOption<${model.interfaceName}>`, isOptional: true });
    fetch.appendContent(`if (!option) {
            option = queryOption;
        }
        setQueryOption(option);
        service.fetchAll(option).then(set${pascalCase(pluralModel)});`);

    const remove = method.addMethod("onDelete");
    remove.addParameter({ name: "id", type: "number" });
    remove.appendContent(`service.remove(id).then((deleted: boolean) => deleted ? onFetch() : null);`);

    writeFileSync(`${config.path}/${fileName}.tsx`, file.generate());

    function getColumnsData(): IColumnFieldData {
        const fields = schema.getFields();
        const columns = [];
        const codes = [];
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            const fieldData = getFieldData(fields[fieldsName[i]]);
            if (!fieldData) { continue; }
            if (fieldData.column) {
                columns.push(fieldData.column);
            }
            if (fieldData.code) {
                codes.push(fieldData.code);
            }
        }
        return {
            code: codes.length ? `\n${tab(2)}${codes.join(`\n${tab(2)}`)}` : "",
            column: columns.length ? `\n${tab(2)}${columns.join(`,\n${tab(2)}`)},` : "",
        };
    }

    function getFieldData(field: Field): IColumnFieldData {
        const fieldName = field.fieldName;
        const fieldProps: IFieldProperties = field.properties;
        const modelMeta: IFieldMeta = getFieldMeta(config.model, fieldName);
        if (!modelMeta.list) { return null as IColumnFieldData; }
        let columnCode = "";
        const prefixCode = "";
        let hasValue = true;
        let render = null;
        let isRenderInline = true;
        switch (fieldProps.type) {
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
                isRenderInline = false;
                render = `dateTime.setTime(r.${fieldName});
                return dateTime.format("Y/m/d");`;
                break;
            case FieldType.Boolean:
                render = `tr(r.${fieldName} ? "yes" : "no")`;
                break;
            case FieldType.Enum:
                if (modelMeta.enum) {
                    // const listClass = file.getClass();
                    const enumName = camelCase(modelMeta.enum.options[0].split(".")[0]) + "Options";
                    const options = modelMeta.enum.options.map((option, index) => `${fieldProps.enum[index]}: tr("enum_${option.split(".")[1].toLowerCase()}")`);
                    // code = `const ${enumName} = {${options.join(', ')}};`;
                    render = `tr(${enumName}[r.${fieldName}])`;
                    // listClass.addProperty({ name: enumName, access: "private", defaultValue: `{${options.join(", ")}}` });
                }
                break;
        }
        if (hasValue) {
            if (render) {
                columnCode = isRenderInline ? `{ title: tr("fld_${fieldName}"), render: (r: ${model.interfaceName}) => ${render} }` : `{
            title: tr("fld_${fieldName}"),
            render: (r: ${model.interfaceName}) => {
                ${render}
            }
        }`;
            } else {
                columnCode = `{ name: "${fieldName}", title: tr("fld_${fieldName}") }`;
            }
        }
        return { column: columnCode, code: prefixCode };
    }

    function hasFieldOfType(type: FieldType) {
        const fields = schema.getFields();
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            if (fields[fieldsName[i]].properties.type === type) { return true; }
        }
        return false;
    }
}
