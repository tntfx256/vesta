import { pascalCase } from "src/util/StringUtil";
import { saveCodeToFile } from "../../util/FsUtil";
import { parseModel } from "../../util/Model";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";

export function genRoot(config: IComponentGenConfig) {
  const model = parseModel(config.model);
  if (!model) {
    return;
  }
  const { path, name } = config;
  const componentName = pascalCase(name);
  const className = componentName === model.className ? `${model.className}Model` : model.className;
  const file = new TsFileGen(componentName);

  // main method
  const method = file.addMethod(componentName);
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
    file.addImport(["Query", "Filter"], "@vesta/core");
    file.addImport(["CrudMenu", "ComponentProps", "FilterBuilder", "Icon"], "@vesta/components");
    file.addImport(["getAccount"], "services/Account");
    file.addImport([model.interfaceName], "cmn/models");
    file.addImport([className === model.className ? model.className : `${model.className} as ${className}`], "cmn/models");
    file.addImport(["CrudPage"], "components/general/CrudPage");
    file.addImport(["Go"], "components/general/Go");

    for (const crud of ["Add", "Edit", "Detail", "List"]) {
      file.addImport([`${model.className}${crud}`], `./${model.className}${crud}`);
    }

    // props
    const props = file.addInterface(`${componentName}Props`);
    props.setParentClass(`ComponentProps, RouteComponentProps`);
    // method.methodType = `ComponentType<${props.name}>`;
    method.returnType = "ReactElement";
    method.addParameter({ name: "props", type: props.name });

    method.appendContent(`
    const tr = Culture.getDictionary().translate;
    const access = getAccount().getAccessList("${model.instanceName}");
    const isRoot = props.location.pathname === "/${model.instanceName}";

    const [showFilter, setShowFilter] = useState(false);
    const [query, setQuery] = useState<Query<${model.interfaceName}>>({ page: 1, size: 20, filter: {} });

    function onApply(filter: Filter<${model.interfaceName}>) {
      setQuery({ ...query, page: 1, filter });
    }
  
    function onReset() {
      setQuery({ ...query, page: 1, filter: {} });
    }

    return (
        <CrudPage title={tr("mdl_${model.className.toLowerCase()}")}>
            <CrudMenu path="${model.instanceName}" access={access}>
            {isRoot ? (
              <li onClick={() => setShowFilter((show) => !show)}>
                <Icon name="search" />
              </li>
            ) : null}
            </CrudMenu>

            {showFilter && isRoot ? <FilterBuilder onApply={onApply} onReset={onReset} model={${className}} /> : null}
            
            <Go path="/${model.instanceName}/add" component={${model.className}Add} permissions={{ ${model.instanceName}: [AclAction.Add] }} />
            <Go path="/${model.instanceName}/edit/:id" component={${model.className}Edit} permissions={{ ${model.instanceName}: [AclAction.Edit] }} />
            <Go path="/${model.instanceName}/detail/:id" component={${model.className}Detail} />
            <Go path="/${model.instanceName}" exact={true}>
                <${model.className}List query={query} setQuery={setQuery} />
            </Go>
        </CrudPage>
    );`);
    return file;
  }
}
