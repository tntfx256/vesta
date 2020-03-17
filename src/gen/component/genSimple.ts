import { writeFileSync } from "fs";
import { camelCase, upperFirst } from "lodash";
import { genRelativePath } from "../../util/FsUtil";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";
import { Vesta } from "../Vesta";

export function genSimple(config: IComponentGenConfig) {
  const path = `${Vesta.directories.components}/${config.path}`;

  const className = upperFirst(camelCase(config.name));

  const file = new TsFileGen(className);
  file.addImport(["React"], "react", true);
  file.addImport(["ComponentType"], "react");
  file.addImport(["IComponentProps"], "@vesta/components");

  if (config.hasRoute) {
    file.addImport(["useStore"], genRelativePath(path, `${Vesta.directories.app}/service/Store`));
    file.addImport(["Culture"], "@vesta/culture");
    file.addImport(["Navbar", "PageTitle", "IComponentProps"], "@vesta/components");
    file.addImport(["RouteComponentProps"], "react-router");
    file.addInterface(`I${className}Params`);
  }
  const translationKey = config.name.toLowerCase();
  // props
  const propsInterface = file.addInterface(`I${className}Props`);
  if (config.hasRoute) {
    propsInterface.setParentClass(`IComponentProps, RouteComponentProps<I${className}Params>`);
  } else {
    propsInterface.setParentClass("IComponentProps");
  }
  // component class
  file.addMixin(
    config.hasRoute
      ? `
export const ${className}: ComponentType<I${className}Props> = (props: I${className}Props) => {
    const tr = Culture.getDictionary().translate;
    const { dispatch } = useStore();

    return (
        <div className="page ${translationKey}-page has-navbar">
            <PageTitle title={tr("${translationKey}")} />
            <Navbar title={tr("${translationKey}")} onBurgerClick={() => dispatch({ navbar: true })} />
            <h1>${className} Page</h1>
        </div>
    );
}`
      : `
export const ${className}: ComponentType<I${className}Props> = (props: I${className}Props) => {

    return (
        <h1>${className} Component</h1>
    );
}`,
    TsFileGen.CodeLocation.AfterInterface
  );

  writeFileSync(`${path}/${className}.tsx`, file.generate());
}
