import {Log} from "../util/Log";
import {ModelGen} from "../gen/code/ModelGen";
import {SassGen} from "../gen/file/SassGen";
import {ExpressControllerGen} from "../gen/code/server/ExpressControllerGen";
import {ComponentGen} from "../gen/code/client/ComponentGen";
import {ArgParser} from "../util/ArgParser";
import {ServiceGen} from "../gen/code/client/ServiceGen";

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