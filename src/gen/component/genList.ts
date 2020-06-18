import { saveCodeToFile } from "../../util/FsUtil";
import { parseModel } from "../../util/Model";
import { pascalCase, plural } from "../../util/StringUtil";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";

export function genList(config: IComponentGenConfig) {
  const model = parseModel(config.model);
  const fileName = `${model.className}List`;
  const schema = model.module.schema;
  const pluralModel = plural(model.instanceName);
  // ts file
  const file = new TsFileGen(fileName);
  const method = file.addMethod(fileName);
  method.shouldExport = true;
  // imports
  file.addImport(["React"], "react", true);
  file.addImport(["ReactElement", "useState", "useEffect", "Dispatch", "SetStateAction"], "react");
  file.addImport(["ComponentProps", "DataTable"], "@vesta/components");
  file.addImport(["Query"], "@vesta/core");
  file.addImport([model.interfaceName], "cmn/models");
  file.addImport([`fetch${plural(model.className)}`, `fetch${plural(model.className)}Count`, `getColumns`], `./${model.className}Service`);

  // props
  const props = file.addInterface(`${fileName}Props`);
  props.setParentClass(`ComponentProps`);
  props.addProperty({ name: "query", type: `Query<${model.interfaceName}>` });
  props.addProperty({ name: "setQuery", type: ` Dispatch<SetStateAction<Query<${model.interfaceName}>>>` });
  method.addParameter({ name: "{ query, setQuery }", type: props.name });
  method.returnType = "ReactElement";

  method.appendContent(`
    const [total, setTotal] = useState(0);
    const [${pluralModel}, set${pascalCase(pluralModel)}] = useState<${model.interfaceName}[]>([]);`);

  method.appendContent(`
    function reload() {
      setQuery((q) => ({ ...q }));
    }
    `);

  method.appendContent(`
    useEffect(() => {
      fetch${plural(model.className)}(query).then(set${plural(model.className)});
      fetch${plural(model.className)}Count(query).then(setTotal);
    }, [query]);
    
    return (
        <DataTable query={query} total={total} columns={getColumns(reload)} records={${pluralModel}} onQuery={setQuery}/>
    );`);

  saveCodeToFile(`${config.path}/${fileName}.tsx`, file.generate());
}
