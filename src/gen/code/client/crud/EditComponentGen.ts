import { FieldType, IModelFields, RelationType } from "@vesta/core";
import { writeFileSync } from "fs";
import { genRelativePath, mkdir } from "../../../../util/FsUtil";
import { plural } from "../../../../util/StringUtil";
import { TsFileGen } from "../../../core/TSFileGen";
import { Vesta } from "../../../file/Vesta";
import { IFieldMeta } from "../../FieldGen";
import { ModelGen } from "../../ModelGen";
import { ICrudComponentGenConfig } from "../ComponentGen";

export class EditComponentGen {
    private className: string;
    private relationalFields: IModelFields;

    constructor(private config: ICrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}Edit`;
        mkdir(config.path);
    }

    public generate() {
        this.relationalFields = ModelGen.getFieldsByType(this.config.model, FieldType.Relation);
        const code = this.genCrudEditComponent();
        // generate file
        writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }

    private genCrudEditComponent() {
        const model = this.config.modelConfig;
        const path = this.config.path;
        const modelObject = ModelGen.getModel(this.config.modelConfig.originalClassName);
        const formClassName = `${this.config.modelConfig.originalClassName}Form`;
        const appDir = Vesta.getInstance().isNewV2() ? "src/app" : "src/client/app";
        // ts file
        const editFile = new TsFileGen(this.className);
        // imports
        editFile.addImport(["React"], "react", true);
        editFile.addImport(["IValidationError"], genRelativePath(path, `${appDir}/medium`));
        editFile.addImport(["FetchById", "PageComponent", "IPageComponentProps", "Save"],
            genRelativePath(path, `${appDir}/components/PageComponent`));
        editFile.addImport([formClassName], `./${formClassName}`);
        editFile.addImport([model.interfaceName],
            genRelativePath(path, `${appDir}/cmn/models/${model.originalClassName}`));
        // params
        editFile.addInterface(`I${this.className}Params`).addProperty({ name: "id", type: "number" });
        // props
        const editProps = editFile.addInterface(`I${this.className}Props`);
        editProps.setParentClass(`IPageComponentProps<I${this.className}Params>`);
        editProps.addProperty({ name: "onFetch", type: `FetchById<${model.interfaceName}>` });
        editProps.addProperty({ name: "onSave", type: `Save<${model.interfaceName}>` });
        editProps.addProperty({ name: "validationErrors", type: "IValidationError" });
        const extProps = [];
        const extPassedProps = [];
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                const meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                if (!meta.form || !meta.relation.showAllOptions) { continue; }
                const field = modelObject.schema.getField(fieldNames[i]);
                const shouldBePlural = field.properties.relation.type !== RelationType.Many2Many;
                editFile.addImport([`I${meta.relation.model}`],
                    genRelativePath(path, `${appDir}/cmn/models/${meta.relation.model}`));
                const pluralName = shouldBePlural ? plural(fieldNames[i]) : fieldNames[i];
                editProps.addProperty({
                    name: pluralName,
                    type: `Array<I${meta.relation.model}>`,
                });
                extProps.push(pluralName);
                extPassedProps.push(`${pluralName}={${pluralName}}`);
            }
        }
        const extPropsCode = extProps.length ? `, ${extProps.join(", ")}` : "";
        const extPassedPropsCode = extPassedProps.length ? ` ${extPassedProps.join(" ")}` : "";
        // state
        const editState = editFile.addInterface(`I${this.className}State`);
        // class
        const editClass = editFile.addClass(this.className);
        editClass.setParentClass(`PageComponent<I${this.className}Props, I${this.className}State>`);
        // render method
        editClass.addMethod("render")
            .setContent(`const { onSave, onFetch, validationErrors${extPropsCode}, history } = this.props;
        const id = +this.props.match.params.id;

        return (
            <div className="crud-page">
                <h2>{this.tr("title_record_edit", this.tr("${model.originalClassName.toLowerCase()}"))}</h2>
                <${formClassName} id={id} onFetch={onFetch} onSave={onSave}
                    validationErrors={validationErrors}${extPassedPropsCode}>
                    <div className="btn-group">
                        <button className="btn btn-primary" type="submit">{this.tr("save")}</button>
                        <button className="btn btn-outline" type="button"
                            onClick={history.goBack}>{this.tr("cancel")}</button>
                    </div>
                </${formClassName}>
            </div>
        );`);
        return editFile.generate();
    }
}
