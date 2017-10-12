import {Log} from "../util/Log";
import {ModelGen} from "../gen/code/ModelGen";
import {SassGen} from "../gen/code/client/SassGen";
import {ExpressControllerGen} from "../gen/code/server/ExpressControllerGen";
import {ComponentGen} from "../gen/code/client/ComponentGen";
import {ArgParser} from "../util/ArgParser";
import {ServiceGen} from "../gen/code/client/ServiceGen";
import {Vesta} from "../gen/file/Vesta";
import {pascalCase} from "../util/StringUtil";
import {FormGen} from "../gen/code/client/FormGen";

export class Gen {

    static init() {
        const argParser = ArgParser.getInstance();
        let type = argParser.get();
        if (argParser.hasHelp()) {
            return type ? Gen.showHelp(type) : Gen.help();
        }
        Gen.generate(type);
    }

    private static generate(type: string) {
        if (['controller'].indexOf(type) >= 0 && !Vesta.getInstance().isApiServer) {
            Log.error('Controller generator is not supported on Client side applications');
            return;
        }
        if (['sass', 'component', 'service', 'form'].indexOf(type) >= 0 && Vesta.getInstance().isApiServer) {
            Log.error(`${pascalCase(type)} generator is not supported on Api applications`);
            return;
        }
        switch (type) {
            case 'controller':
                ExpressControllerGen.init();
                break;
            case 'model':
                ModelGen.init();
                break;
            case 'sass':
                SassGen.init();
                break;
            case 'component':
                ComponentGen.init();
                break;
            case 'form':
                FormGen.init();
                break;
            case 'service':
                ServiceGen.init();
                break;
            default:
                Log.error(`Invalid generator type ${type || ''}\n`);
        }
    }

    private static showHelp(type) {
        switch (type) {
            case 'controller':
                ExpressControllerGen.help();
                break;
            case 'model':
                break;
            case 'sass':
                SassGen.help();
                break;
            case 'component':
                ComponentGen.help();
                break;
            case 'form':
                FormGen.help();
                break;
            default:
                Log.error(`Invalid generator option ${type}\n`);
        }
    }

    static help() {
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
}