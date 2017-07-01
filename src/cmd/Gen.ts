import {Log} from "../util/Log";
import {ModelGen} from "../gen/code/ModelGen";
import {SassGen} from "../gen/file/SassGen";
import {ExpressControllerGen} from "../gen/code/server/ExpressControllerGen";
import {ComponentGen} from "../gen/code/client/ComponentGen";
import {ArgParser} from "../util/ArgParser";

export class Gen {

    static init(argParser: ArgParser) {
        let type = argParser.get();
        if (argParser.hasHelp()) {
            return Gen.showHelp(type);
        }
        Gen.generate(type, argParser);
    }

    private static generate(type: string, argParser: ArgParser) {
        switch (type) {
            case 'controller':
                ExpressControllerGen.init(argParser);
                break;
            case 'model':
                ModelGen.init(argParser);
                break;
            case 'sass':
                SassGen.init(argParser);
                break;
            case 'component':
                ComponentGen.init(argParser);
                break;
            default:
                Log.error(`Invalid generator type ${type || ''}`);
        }
    }

    private static showHelp(type) {
        switch (type) {
            case 'controller':
                break;
            case 'model':
                break;
            case 'sass':
                SassGen.help();
                break;
            case 'component':
                ComponentGen.help();
                break;
            default:
                Log.error(`Invalid generator option ${type}`);
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
                    sass            Client             Creating a sass file of specific type (component, page, font)   
                    
    NAME        The name of the snippet
    
Run 'vesta gen <TYPE> --help' for more information on TYPE
`);
    }
}