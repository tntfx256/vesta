import { saveCodeToFile } from "src/util/FsUtil";
import { parseModel } from "../../util/Model";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";

export function genUpsert(config: IComponentGenConfig, isEdit: boolean) {
  const model = parseModel(config.model);
  const fileName = `${model.className}${isEdit ? "Edit" : "Add"}`;
  // const appDir = Vesta.directories.app;
  const file = new TsFileGen(model.className);
  const method = file.addMethod(fileName);
  method.shouldExport = true;
  method.returnType = "ReactElement";

  // imports
  file.addImport(["React"], "react", true);
  file.addImport(["ReactElement"], "react");
  file.addImport(["RouteComponentProps"], "react-router-dom");
  file.addImport(["Culture"], "@vesta/culture");
  file.addImport(["Button", "ComponentProps", "ButtonGroup"], "@vesta/components");
  file.addImport([`${model.className}Form`], `./${model.className}Form`);

  // params
  let paramGeneric = "";
  if (isEdit) {
    const params = file.addInterface(`${model.className}Params`);
    params.addProperty({ name: "id", type: "string" });
    paramGeneric = `<${params.name}>`;
  }
  // props
  const props = file.addInterface(`${model.className}Props`);
  props.setParentClass(`ComponentProps, RouteComponentProps${paramGeneric}`);
  // method
  method.addParameter({ name: "props", type: props.name });
  method.appendContent(`
    const tr = Culture.getDictionary().translate;

    function goBack(){
      props.history.goBack();
    }

    return (
        <div className="crud-page">
            <h2>{tr("${isEdit ? "title_record_edit" : "title_record_add"}", tr("${model.instanceName.toLowerCase()}"))}</h2>
            <${model.className}Form ${isEdit ? "id={+props.match.params.id} " : ""}goBack={goBack}>
                <ButtonGroup>
                    <Button variant="contained" type="submit">{tr("${isEdit ? "save" : "add"}")}</Button>
                    <Button variant="contained" type="button" onClick={goBack}>{tr("cancel")}</Button>
                </ButtonGroup>
            </${model.className}Form>
        </div>
    );`);

  saveCodeToFile(`${config.path}/${fileName}.tsx`, file.generate());
}
