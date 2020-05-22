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
  file.addImport(["ReactElement", "useState", "useEffect"], "react");
  file.addImport(["ComponentProps", "DataTable"], "@vesta/components");
  file.addImport(["QueryOption"], "@vesta/core");
  file.addImport([model.interfaceName], "cmn/models");
  file.addImport([`fetch${plural(model.className)}`, `fetch${plural(model.className)}Count`, `getColumns`], "./service");

  // props
  const props = file.addInterface(`${fileName}Props`);
  props.setParentClass(`ComponentProps`);
  props.addProperty({ name: "queryOption", type: `QueryOption<${model.interfaceName}>` });
  props.addProperty({ name: "setQueryOption", type: `(queryOption: QueryOption<${model.interfaceName}>) => void` });
  method.addParameter({ name: "{ queryOption, setQueryOption }", type: props.name });
  method.returnType = "ReactElement";

  method.appendContent(`
    const [total, setTotal] = useState(0);
    const [${pluralModel}, set${pascalCase(pluralModel)}] = useState<${model.interfaceName}[]>([]);`);

  method.appendContent(`
    function reload() {
      setQueryOption({ ...queryOption });
    }

    function onPagination(page: number, size: number){
      setQueryOption({...queryOption, page, size});
    }
    `);

  method.appendContent(`
    useEffect(() => {
      fetch${plural(model.className)}(queryOption).then(set${plural(model.className)});
      fetch${plural(model.className)}Count(queryOption).then(setTotal);
    }, [queryOption]);
    
    return (
        <DataTable queryOption={queryOption} total={total} columns={getColumns(reload)} records={${pluralModel}} onPagination={onPagination}/>
    );`);

  saveCodeToFile(`${config.path}/${fileName}.tsx`, file.generate());
}
