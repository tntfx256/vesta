import { ModelConstructor } from "@vesta/core";
import { camelCase } from "lodash";
import { join } from "path";
import { ArgParser } from "../util/ArgParser";
import { mkdir } from "../util/FsUtil";
import { Log } from "../util/Log";
import { pascalCase } from "../util/StringUtil";
import { genDetails } from "./component/genDetails";
import { genForm } from "./component/genForm";
import { genList } from "./component/genList";
import { genRoot } from "./component/genRoot";
import { genService } from "./component/genService";
import { genSimple } from "./component/genSimple";
import { genUpsert } from "./component/genUpsert";
import { Vesta } from "./Vesta";

export interface IComponentGenConfig {
  model: string;
  name: string;
  isPage: boolean;
  path: string;
}

export interface IModelConfig {
  className: string;
  file: string;
  instanceName: string;
  interfaceName: string;
  module: ModelConstructor;
}

export class ComponentGen {
  public static help() {
    Log.write(`
Usage: vesta gen component <NAME> [options...]

Creating React component

    NAME        The name of the component

Options:
    --page      Generates page component with route params
    --model     Generates CRUD component for specified model
    --path      Where to save component [default: src/components]
                path are relative to src/components

Example:
    vesta gen component test --model=User
    vesta gen component test --page --path=global
`);
  }

  public static init() {
    const argParser = ArgParser.getInstance();
    const config: IComponentGenConfig = {
      isPage: argParser.has("page"),
      model: argParser.get("model", ""),
      name: argParser.get(),
      path: argParser.get("path", ""),
    } as IComponentGenConfig;
    if (!config.name) {
      Log.error("Missing/Invalid component name\nSee 'vesta gen component --help' for more information\n");
      return;
    }
    const isNative = Vesta.isNative;
    config.name = pascalCase(config.name);
    if (config.model) {
      config.model = pascalCase(config.model);
      config.isPage = true;
    }
    if (config.path) {
      if (isNative) {
        config.path = join(Vesta.directories.app, config.path);
      } else {
        config.path = join(Vesta.directories.components, config.path);
      }
    } else {
      if (isNative) {
        config.path = config.isPage ? join(Vesta.directories.app, "screens") : Vesta.directories.components;
      } else {
        config.path = config.isPage ? join(Vesta.directories.components, "pages") : Vesta.directories.components;
      }
    }

    if (config.model) {
      config.path = join(config.path, config.name);
    }

    new ComponentGen(config).generate();
  }

  constructor(private config: IComponentGenConfig) {
    mkdir(config.path);
  }

  public generate() {
    if (this.config.model) {
      if (Vesta.isNative) {
        Log.error("model option is not supported for native platform", true);
      }
      genRoot(this.config);
      genService(this.config);
      genForm(this.config);
      genList(this.config);
      genUpsert(this.config, false);
      genUpsert(this.config, true);
      genDetails(this.config);
    } else {
      genSimple(this.config);
    }
  }
}
