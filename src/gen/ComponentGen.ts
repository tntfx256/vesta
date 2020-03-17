import { IModel } from "@vesta/core";
import { camelCase, upperFirst } from "lodash";
import { ArgParser } from "../util/ArgParser";
import { mkdir } from "../util/FsUtil";
import { Log } from "../util/Log";
import { pascalCase } from "../util/StringUtil";
import { genDetails } from "./component/genDetails";
import { genForm } from "./component/genForm";
import { genList } from "./component/genList";
import { genRoot } from "./component/genRoot";
import { genSass } from "./component/genSass";
import { genSimple } from "./component/genSimple";
import { genUpsert } from "./component/genUpsert";
import { Vesta } from "./Vesta";

export interface IComponentGenConfig {
  hasStyle: boolean;
  model: string;
  name: string;
  hasRoute: boolean;
  path: string;
}

export interface IModelConfig {
  className: string;
  file: string;
  instanceName: string;
  interfaceName: string;
  module: IModel;
  impPath: string;
}

export class ComponentGen {
  public static help() {
    Log.write(`
Usage: vesta gen component <NAME> [options...]

Creating React component

    NAME        The name of the component

Options:
    --with-route    Generates page component with route params
    --no-style      Do not generate scss style file
    --model         Generates CRUD component for specified model
    --path          Where to save component [default: src/component]

Example:
    // in following command the final path will be src/components/general/form
    vesta gen component test --no-style --path=general/form

    // however, for next command it will be general/form
    vesta gen component test --no-style --path=/general/form

    vesta gen component test --model=User
`);
  }

  public static init() {
    const argParser = ArgParser.getInstance();
    const config: IComponentGenConfig = {
      hasRoute: argParser.has("--with-route"),
      hasStyle: !argParser.has("--no-style"),
      model: argParser.get("--model", ""),
      name: argParser.get(),
      path: argParser.get("--path", "."),
    } as IComponentGenConfig;
    if (!config.name) {
      Log.error("Missing/Invalid component name\nSee 'vesta gen component --help' for more information\n");
      return;
    }
    if (config.model) {
      config.model = pascalCase(config.model);
      config.hasRoute = true;
    }
    new ComponentGen(config).generate();
  }

  constructor(private config: IComponentGenConfig) {
    const className = upperFirst(camelCase(config.name));
    let path = config.path.startsWith("/") ? config.path : `${Vesta.directories.components}/${config.path}`;
    mkdir(path);
    if (this.config.hasStyle) {
      genSass(className, path);
    }

    if (config.model) {
      path = `${path}/${className}`;
    }
  }

  public generate() {
    if (this.config.model) {
      genRoot(this.config);
      const crudComponentPath = `${Vesta.directories.components}/${this.config.path}/${camelCase(this.config.model)}`;
      const crudConfig = { ...this.config, path: crudComponentPath };
      genForm(crudConfig);
      genList(crudConfig);
      genUpsert(crudConfig, false);
      genUpsert(crudConfig, true);
      genDetails(crudConfig);
    } else {
      genSimple(this.config);
    }
  }
}
