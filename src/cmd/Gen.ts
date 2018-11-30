import { ComponentGen } from "../gen/code/client/ComponentGen";
import { FormGen } from "../gen/code/client/FormGen";
import { SassGen } from "../gen/code/client/SassGen";
import { ServiceGen } from "../gen/code/client/ServiceGen";
import { ModelGen } from "../gen/code/ModelGen";
import { ExpressControllerGen } from "../gen/code/server/ExpressControllerGen";
import { Vesta } from "../gen/file/Vesta";
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
                    sass            Client             Creating a sass file of specific type (component, page, font)

    NAME        The name of the snippet

Run 'vesta gen <TYPE> --help' for more information on TYPE
`);
    }

    private static generate(type: string) {
        if (["controller"].indexOf(type) >= 0 && !Vesta.getInstance().isApiServer) {
            return Log.error("Controller generator is not supported on Client side applications");
        }
        if (["sass", "component", "service", "form"].indexOf(type) >= 0 && Vesta.getInstance().isApiServer) {
            return Log.error(`${pascalCase(type)} generator is not supported on Api applications`);
        }
        switch (type) {
            case "controller":
                ExpressControllerGen.init();
                break;
            case "model":
                ModelGen.init();
                break;
            case "sass":
                SassGen.init();
                break;
            case "component":
                ComponentGen.init();
                break;
            case "form":
                FormGen.init();
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
                ExpressControllerGen.help();
                break;
            case "model":
                break;
            case "sass":
                SassGen.help();
                break;
            case "component":
                ComponentGen.help();
                break;
            case "form":
                FormGen.help();
                break;
            default:
                Log.error(`Invalid generator option ${type}\n`);
        }
    }
}
