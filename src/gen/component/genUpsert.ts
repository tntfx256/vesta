import { writeFileSync } from "fs-extra";
import { parseModel } from "../../util/Model";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";

export function genUpsert(config: IComponentGenConfig, isEdit: boolean) {

    const model = parseModel(config.model);
    const fileName = `${model.className}${isEdit ? "Edit" : "Add"}`;
    // const appDir = Vesta.directories.app;
    const file = new TsFileGen(model.className);
    const method = file.addMethod(fileName);
    method.isArrow = true;
    method.shouldExport = true;

    // imports
    file.addImport(["React"], "react", true);
    file.addImport(["ComponentType"], "react");
    file.addImport(["RouteComponentProps"], "react-router");
    file.addImport(["Culture"], "@vesta/culture");
    file.addImport(["Button", "IComponentProps"], "@vesta/components");
    file.addImport([`${model.className}Form`], `./${model.className}Form`);
    // params
    const params = file.addInterface(`I${model.className}Params`);
    if (isEdit) {
        params.addProperty({ name: "id", type: "string" });
    }
    // props
    const props = file.addInterface(`I${model.className}Props`);
    props.setParentClass(`IComponentProps, RouteComponentProps<${params.name}>`);
    // method
    method.methodType = `ComponentType<I${model.className}Props>`;
    method.addParameter({ name: "props", type: `I${model.className}Props` });
    method.appendContent(`
    const tr = Culture.getDictionary().translate;

    return (
        <div className="crud-page">
            <h2>{tr(${isEdit ? "title_record_edit" : "title_record_add"}, tr("${model.instanceName.toLowerCase()}"))}</h2>
            <${model.className}Form ${isEdit ? "id={props.match.params.id} " : ""}goBack={goBack}>
                <div className="btn-group">
                    <Button color="primary" variant="contained">{tr("${isEdit ? "save" : "add"}")}</Button>
                    <Button color="secondary" variant="outlined" type="button" onClick={goBack}>{tr("cancel")}</Button>
                </div>
            </${model.className}Form>
        </div>
    );`);

    const back = method.addMethod("goBack");
    back.appendContent(`props.history.goBack();`);
    writeFileSync(`${config.path}/${fileName}.tsx`, file.generate());
}
