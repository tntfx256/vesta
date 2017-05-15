import {Log} from "../util/Log";
import {ModelGen} from "../gen/code/ModelGen";
import {SassGen} from "../gen/file/SassGen";
import {ExpressControllerGen} from "../gen/code/server/ExpressControllerGen";
import {ComponentGen} from "../gen/code/client/ComponentGen";

export class Gen {

    static generateCode(args: Array<string>) {
        let type = args.shift().toLowerCase();
        let name = args[0];
        if (name || (type != 'controller')) {
            if (!name || !name.match(/^[a-z][a-z0-9\-_]+/i)) {
                return Log.error('Please enter a valid name');
            }
        }
        switch (type) {
            case 'controller':
                ExpressControllerGen.getGeneratorConfig(name, config => {
                    if (config.model instanceof Array) {
                        for (let i = config.model.length; i--;) {
                            let parts = config.model[i].split(/[\/\\]/);
                            let modelName = parts[parts.length - 1];
                            let controller = new ExpressControllerGen({
                                name: modelName,
                                route: config.route,
                                model: config.model[i],
                            });
                            controller.generate();
                        }
                    } else {
                        let controller = new ExpressControllerGen(config);
                        controller.generate();
                    }
                });
                break;
            case 'model':
                let model = new ModelGen(args);
                model.generate();
                break;
            // case 'service':
            // case 'form':
            //     NGFormGen.getGeneratorConfig(config => {
            //         config.name = name;
            //         config.writeToFile = true;
            //         let ngForm = new NGFormGen(config);
            //         ngForm.generate();
            //     });
            //     break;
            case 'sass':
                let sass = new SassGen(args[1], args[0].replace('--', ''));
                sass.generate();
                break;
            case 'component':
                let component = ComponentGen.getInstance(args);
                component && component.generate();
                break;
            default:
                Log.error(`Invalid generator option ${type}`);
        }
    }

    static parse(args: Array<string>) {
        if (!args.length || ['-h', '--help', 'help'].indexOf(args[0]) >= 0) {
            return Gen.help();
        }
        Gen.generateCode(args);
    }

    static help() {
        Log.write(`
Usage: vesta gen TYPE [options...] NAME

Creating new project after asking a series of questions through interactive shell

    TYPE        Type of code snippet to be generated. Possible values are:
                    - model         Creating a model
                    - sass          Creating a sass file of specific type (component, page, font)
                    - controller    Creating a client (angular) or server (Vesta API) side controller
                    - directive     Creating an angular directive
                    - filter        Creating an angular filter
                    - service       Creating an angular service
                    - component     Creating a react component
                    
    NAME        The name of the snippet
    
Options:
    --font      Generates a sass file for font (only sass type)
    --page      Generates a sass file for a page (only sass type)
    --component Generates a sass file for a component (only sass type)
`);
    }
}