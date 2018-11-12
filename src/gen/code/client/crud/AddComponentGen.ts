import { writeFileSync } from "fs";
import { genRelativePath, mkdir } from "../../../../util/FsUtil";
import { TsFileGen } from "../../../core/TSFileGen";
import { Vesta } from "../../../file/Vesta";
import { ICrudComponentGenConfig } from "../ComponentGen";

export class AddComponentGen {
    private className: string;

    constructor(private config: ICrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}Add`;
        mkdir(config.path);
    }

    public generate() {
        const code = this.genCrudAddComponent();
        // generate file
        writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }

    private genCrudAddComponent() {
        const model = this.config.modelConfig;
        const path = this.config.path;
        const formClassName = `${this.config.modelConfig.originalClassName}Form`;
        const appDir = Vesta.getInstance().isNewV2() ? "src/app" : "src/client/app";
        // ts file
        const addFile = new TsFileGen(this.className);
        // imports
        addFile.addImport(["React"], "react", true);
        addFile.addImport(["PageComponent", "IPageComponentProps"], genRelativePath(path, `${appDir}/components/PageComponent`));
        addFile.addImport([formClassName], `./${formClassName}`);
        // params
        addFile.addInterface(`I${this.className}Params`);
        // props
        const addProps = addFile.addInterface(`I${this.className}Props`);
        // state
        const addState = addFile.addInterface(`I${this.className}State`);
        // class
        const addClass = addFile.addClass(this.className);
        addClass.shouldExport(true);
        addClass.setParentClass(`PageComponent<I${this.className}Props, I${this.className}State>`);
        // render method
        addClass.addMethod("render")
            .setContent(`
        return (
            <div className="crud-page">
                <h1>{this.tr("title_record_add", this.tr("${model.originalClassName.toLowerCase()}"))}</h1>
                <${formClassName} goBack={this.goBack}>
                    <div className="btn-group">
                        <button className="btn btn-primary" type="submit">{this.tr("add")}</button>
                        <button className="btn btn-outline" type="button"
                            onClick={this.goBack}>{this.tr("cancel")}</button>
                    </div>
                </${formClassName}>
            </div>
        );`);

        const gbMethod = addClass.addMethod("goBack", "private");
        gbMethod.setAsArrowFunction(true);
        gbMethod.setContent(`this.props.history.goBack();`);

        return addFile.generate();
    }
}
