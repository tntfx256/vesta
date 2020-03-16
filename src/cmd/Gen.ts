import { ComponentGen } from "../gen/ComponentGen";
import { ControllerGen } from "../gen/ControllerGen";
import { ModelGen } from "../gen/ModelGen";
import { ServiceGen } from "../gen/ServiceGen";
import { Vesta } from "../gen/Vesta";
import { ArgParser } from "../util/ArgParser";
import { Log } from "../util/Log";
import { pascalCase } from "../util/StringUtil";

export class Gen {
  public static init() {
    const argParser = ArgParser.getInstance();
    const type = argParser.get();
    if (argParser.hasHelp()) {
      return type ? Gen.showHelp(type) : Gen.help();
    }
    Gen.generate(type);
  }

  public static help() {
    // todo: add new culture
    Log.write(`
Usage: vesta gen <TYPE> <NAME> [options...]

Creating specified code snippet base on provided configuration

    TYPE        Type of code snippet to be generated. Possible values are:
                    TYPE            Side               Description
                    ---------------------------------------------------------------------------------------------
                    controller      Server             Creating a server side (Vesta API) controller
                    model           Client/Server      Creating a model
                    component       Client             Creating a react component
                    service         Client             Creating a service provider

    NAME        The name of the snippet

Run 'vesta gen <TYPE> --help' for more information on TYPE
`);
  }

  private static generate(type: string) {
    if (["controller"].indexOf(type) >= 0 && !Vesta.isApiServer) {
      return Log.error("Controller generator is not supported on Client side applications", true);
    }
    if (["component", "service"].indexOf(type) >= 0 && Vesta.isApiServer) {
      return Log.error(`${pascalCase(type)} generator is not supported on Api applications`, true);
    }
    switch (type) {
      case "controller":
        ControllerGen.init();
        break;
      case "model":
        ModelGen.init();
        break;
      case "component":
        ComponentGen.init();
        break;
      case "service":
        ServiceGen.init();
        break;
      default:
        Log.error(`Invalid generator type ${type || ""}\n`);
    }
  }

  private static showHelp(type) {
    switch (type) {
      case "controller":
        ControllerGen.help();
        break;
      case "model":
        break;
      case "component":
        ComponentGen.help();
        break;
      default:
        Log.error(`Invalid generator option ${type}\n`);
    }
  }
}
