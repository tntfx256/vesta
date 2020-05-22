import { writeFileSync } from "fs";
import { camelCase, upperFirst } from "lodash";
import { genRelativePath, saveCodeToFile } from "../../util/FsUtil";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";
import { Vesta } from "../Vesta";

export function genSimple(config: IComponentGenConfig) {
  const className = upperFirst(camelCase(config.name));

  const file = new TsFileGen(className);
  file.addImport(["React"], "react", true);
  file.addImport(["ReactElement"], "react");
  file.addImport(["ComponentProps"], "@vesta/components");

  if (config.isPage) {
    file.addImport(["Page"], `components/general/Page`);
    file.addImport(["Culture"], "@vesta/culture");
    file.addImport(["ComponentProps"], "@vesta/components");
    file.addImport(["RouteComponentProps"], "react-router-dom");
    file.addInterface(`I${className}Params`);
  }
  const translationKey = config.name.toLowerCase();
  // props
  const propsInterface = file.addInterface(`${className}Props`);
  if (config.isPage) {
    propsInterface.setParentClass(`ComponentProps, RouteComponentProps<I${className}Params>`);
  } else {
    propsInterface.setParentClass("ComponentProps");
  }
  // component class
  file.addMixin(
    config.isPage
      ? `
export function ${className}(props: ${className}Props): ReactElement {
    const tr = Culture.getDictionary().translate;

    return (
        <Page title={tr("${translationKey}")}>
            <h1>${className} Page</h1>
        </Page>
    );
}`
      : `
export function ${className}(props: ${className}Props): ReactElement {

    return (
        <h1>${className} Component</h1>
    );
}`,
    TsFileGen.CodeLocation.AfterInterface
  );

  saveCodeToFile(`${config.path}/${className}.tsx`, file.generate());
}
