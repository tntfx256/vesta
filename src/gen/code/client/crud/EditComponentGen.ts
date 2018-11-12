import { writeFileSync } from "fs";
import { genRelativePath, mkdir } from "../../../../util/FsUtil";
import { TsFileGen } from "../../../core/TSFileGen";
import { Vesta } from "../../../file/Vesta";
import { ModelGen } from "../../ModelGen";
import { ICrudComponentGenConfig } from "../ComponentGen";

export class EditComponentGen {
    private className: string;

    constructor(private config: ICrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}Edit`;
        mkdir(config.path);
    }

    public generate() {
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
        editFile.addImport(["PageComponent", "IPageComponentProps"], genRelativePath(path, `${appDir}/components/PageComponent`));
        editFile.addImport([formClassName], `./${formClassName}`);
        editFile.addImport([model.interfaceName],
            genRelativePath(path, `${appDir}/cmn/models/${model.originalClassName}`));
        // params
        editFile.addInterface(`I${this.className}Params`).addProperty({ name: "id", type: "number" });
        // props
        const editProps = editFile.addInterface(`I${this.className}Props`);
        // state
        const editState = editFile.addInterface(`I${this.className}State`);
        // class
        const editClass = editFile.addClass(this.className);
        editClass.shouldExport(true);
        editClass.setParentClass(`PageComponent<I${this.className}Props, I${this.className}State>`);
        // render method
        editClass.addMethod("render")
            .setContent(`
        const id = +this.props.match.params.id;

        return (
            <div className="crud-page">
                <h2>{this.tr("title_record_edit", this.tr("${model.originalClassName.toLowerCase()}"))}</h2>
                <${formClassName} id={id} goBack={this.goBack}>
                    <div className="btn-group">
                        <button className="btn btn-primary" type="submit">{this.tr("save")}</button>
                        <button className="btn btn-outline" type="button"
                            onClick={this.goBack}>{this.tr("cancel")}</button>
                    </div>
                </${formClassName}>
            </div>
        );`);

        const gbMethod = editClass.addMethod("goBack", "private");
        gbMethod.setAsArrowFunction(true);
        gbMethod.setContent(`this.props.history.goBack();`);

        return editFile.generate();
    }
}
