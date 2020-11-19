import { writeFileSync } from "fs";
import { camelCase, upperFirst } from "lodash";
import { genRelativePath, saveCodeToFile } from "../../util/FsUtil";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";
import { Vesta } from "../Vesta";

export function genSimple(config: IComponentGenConfig) {
  const isNative = Vesta.isNative;
  const className = upperFirst(camelCase(config.name));

  const file = new TsFileGen(className);
  file.addImport(["React"], "react", true);
  file.addImport(["ReactElement"], "react");
  if (isNative) {
    file.addImport(["Text", "View"], "react-native");
  } else {
    file.addImport(["ComponentProps"], "@vesta/components");
  }

  if (config.isPage) {
    file.addImport(["Culture"], "@vesta/culture");
    if (isNative) {
      file.addImport(["StackScreenProps"], "@react-navigation/stack");
      file.addImport(["Screen"], "components/Screen", true);
    } else {
      file.addImport(["Page"], `components/general/Page`);
      file.addImport(["ComponentProps"], "@vesta/components");
      file.addImport(["RouteComponentProps"], "react-router-dom");
      file.addInterface(`${className}Params`);
    }
  }
  const translationKey = config.name.toLowerCase();
  // props
  const propsInterface = file.addInterface(`${className}Props`);
  if (config.isPage) {
    if (isNative) {
      propsInterface.setParentClass(`StackScreenProps<any, any>`);
    } else {
      propsInterface.setParentClass(`ComponentProps, RouteComponentProps<${className}Params>`);
    }
  } else {
    if (!isNative) {
      propsInterface.setParentClass("ComponentProps");
    }
  }
  // component class
  const wrapper = isNative ? "Screen" : "Page";
  const innerWrapper = isNative ? "View" : "div";
  const text = isNative ? "Text" : "h1";
  file.addMixin(
    config.isPage
      ? `
export default function ${className}(props: ${className}Props): ReactElement {
    const tr = Culture.getDictionary().translate;

    return (
        <${wrapper} title={tr("${translationKey}")}>
          <${innerWrapper}>
            <${text}>${className} Page</${text}>
          </${innerWrapper}>
        </${wrapper}>
    );
}`
      : `
export default function ${className}(props: ${className}Props): ReactElement {

    return (
      <${innerWrapper}>
        <${text}>${className} Component</${text}>
      </${innerWrapper}>
    );
}`,
    TsFileGen.CodeLocation.AfterInterface
  );

  saveCodeToFile(`${config.path}/${className}.tsx`, file.generate());
}
