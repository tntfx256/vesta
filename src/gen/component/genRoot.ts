import { saveCodeToFile } from "../../util/FsUtil";
import { parseModel } from "../../util/Model";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";

export function genRoot(config: IComponentGenConfig) {
  const model = parseModel(config.model);
  if (!model) {
    return;
  }
  const { path } = config;
  const file = new TsFileGen(config.name);
  // main method
  const method = file.addMethod(model.className);
  // method.isArrow = true;
  method.shouldExport = true;

  const componentFile = genComponentFile();
  saveCodeToFile(`${path}/index.tsx`, componentFile.generate());

  function genComponentFile(): TsFileGen {
    file.addImport(["React"], "react", true);
    file.addImport(["ReactElement", "useState"], "react");
    file.addImport(["RouteComponentProps"], "react-router-dom");
    file.addImport(["Culture"], "@vesta/culture");
    file.addImport(["AclAction"], "@vesta/services");
    file.addImport(["QueryOption"], "@vesta/core");
    file.addImport(["CrudMenu", "ComponentProps"], "@vesta/components");
    file.addImport(["getAccount"], "services/Account");
    file.addImport([model.interfaceName], "cmn/models");
    file.addImport(["CrudPage"], "components/general/CrudPage");
    file.addImport(["Go"], "components/general/Go");

    for (const crud of ["Add", "Edit", "Detail", "List"]) {
      file.addImport([`${model.className}${crud}`], `./${model.className}${crud}`);
    }

    // params interface
    const params = file.addInterface(`${model.className}Params`);

    // props
    const props = file.addInterface(`${model.className}Props`);
    props.setParentClass(`ComponentProps, RouteComponentProps<${params.name}>`);
    // method.methodType = `ComponentType<${props.name}>`;
    method.returnType = "ReactElement";
    method.addParameter({ name: "props", type: props.name });

    method.appendContent(`
    const access = getAccount().getAccessList("${model.instanceName}");
    const tr = Culture.getDictionary().translate;
    const [queryOption, setQueryOption] = useState<QueryOption<${model.interfaceName}>>({ page: 1, size: 20 });

    return (
        <CrudPage title={tr("mdl_${model.className.toLowerCase()}")}>
            <CrudMenu path="${model.instanceName}" access={access} />
            
            <Go path="/${model.instanceName}/add" component={${model.className}Add} permissions={{ ${model.instanceName}: [AclAction.Add] }} />
            <Go path="/${model.instanceName}/edit/:id" component={${model.className}Edit} permissions={{ ${model.instanceName}: [AclAction.Edit] }} />
            <Go path="/${model.instanceName}/detail/:id" component={${model.className}Detail} />
            <Go path="/${model.instanceName}" exact={true}>
                <${model.className}List queryOption={queryOption} setQueryOption={setQueryOption} />
            </Go>
        </CrudPage>
    );`);
    return file;
  }
}
