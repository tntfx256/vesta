#! /usr/bin/env node
import * as program from "commander";
import * as _ from "lodash";
import * as fs from "fs-extra";
import * as path from "path";
import {Question} from "inquirer";
import {ProjectGen, IProjectGenConfig} from "./gen/ProjectGen";
import {Vesta} from "./gen/file/Vesta";
import {ModelGen} from "./gen/code/ModelGen";
import {NGControllerGen, ControllerType} from "./gen/code/client/ng/NGControllerGen";
import {NGDirectiveGen} from "./gen/code/client/ng/NGDirectiveGen";
import {NGServiceGen} from "./gen/code/client/ng/NGServiceGen";
import {NGFormGen} from "./gen/code/client/ng/NGFormGen";
import {NGFilterGen} from "./gen/code/client/ng/NGFilterGen";
import {SassGen} from "./gen/file/SassGen";
import {CordovaGen} from "./gen/file/CordovaGen";
import {Deployer} from "./deploy/Deployer";
import {Backuper} from "./deploy/Backuper";
import {ExpressControllerGen} from "./gen/code/server/ExpressControllerGen";
import {Log} from "./util/Log";
import {Util} from "./util/Util";
import {DockerUtil} from "./util/DockerUtil";

let packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), {encoding: 'utf8'}));
program.version(`Vesta Platform v${packageInfo.version}`);

program
    .option('init [option]', 'Initiate a server')
    .option('create [projectName]', 'Create new project by interactive CLI')
    .option('deploy', 'Deploy a project from remote repository')
    // .option('plugin', 'Adding a Cordova Plugin')
    .option('gen [model, controller, directive, service] name', 'Generate code for mentioned type')
    .option('deploy [httpRepoPath]')
    .option('update')
    .option('docker [cleanup]')
    .option('backup [deployFileName]');
//program
//    .command('create [projectName]', 'Create new project by interactive CLI')
//    .command('plugin [name]');


program.parse(process.argv);

let args:Array<string> = program['rawArgs'];
args.shift();
args.shift();
let command = args.shift();

switch (command) {
    case 'create':
        createProject();
        break;
    case 'plugin':
        handleCordovaPlugin(args);
        break;
    case 'gen':
        generateCode(args);
        break;
    case 'update':
        Vesta.updatePackages();
        break;
    case 'deploy':
        deployProject(args);
        break;
    case 'backup':
        backupProject(args);
        break;
    case 'init':
        initProject(args);
        break;
    case 'docker':
        DockerUtil.cleanup();
        break;
    default:
        Log.error('Invalid operation');
}

function createProject() {
    let [projectCategory,projectName] = program['create'].split('/');
    if (!projectName) {
        projectName = projectCategory;
        projectCategory = '';
    }
    if (!projectName.match(/^[a-z][a-z0-9-_]+/i)) {
        return console.error('projectName may only contains [letters, numbers, dash, underscore]');
    }
    projectName = _.camelCase(projectName);
    ProjectGen.getGeneratorConfig(projectName, projectCategory)
        .then((config:IProjectGenConfig) => {
            let project = new ProjectGen(config);
            project.generate();
        })
}

function handleCordovaPlugin(args:Array<string>) {
    let cordova = CordovaGen.getInstance(),
        subCommand = args.shift();
    if (subCommand == 'add') {
        cordova.install(...args);
    } else {
        cordova.uninstall(...args);
    }
}

function generateCode(args:Array<string>) {
    let type = args.shift().toLowerCase();
    let name = args[0];
    let vesta = Vesta.getInstance(),
        projectConfig = vesta.getConfig();
    if (name || (type != 'controller')) {
        if (!name || !name.match(/^[a-z][a-z0-9\-_]+/i)) {
            return Log.error('Please enter a valid name');
        }
    }
    switch (type) {
        case 'controller':
            if (projectConfig.type == ProjectGen.Type.ClientSide) {
                NGControllerGen.getGeneratorConfig(name)
                    .then(config => {
                        if (<any>config.model instanceof Array) {
                            for (let i = config.model.length; i--;) {
                                let parts = config.model[i].split(/[\/\\]/);
                                let modelName = parts[parts.length - 1];
                                let ngController = new NGControllerGen({
                                    name: modelName,
                                    type: ControllerType.List,
                                    module: config.module,
                                    model: config.model[i],
                                    injects: config.injects.slice(0),
                                    openFormInModal: true
                                });
                                ngController.generate();
                            }
                        } else {
                            config.name = name;
                            let ngController = new NGControllerGen(config);
                            ngController.generate();
                        }

                    })
                    .catch(err=> console.error(err.message))
            } else {
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
            }
            break;
        case 'model':
            let model = new ModelGen(args);
            model.generate();
            break;
        case 'directive':
            NGDirectiveGen.getGeneratorConfig(config=> {
                config.name = name;
                let ngDirective = new NGDirectiveGen(config);
                ngDirective.generate();
            });
            break;
        case 'filter':
            NGFilterGen.getGeneratorConfig(config=> {
                config.name = name;
                let ngFilter = new NGFilterGen(config);
                ngFilter.generate();
            });
            break;
        case 'service':
            NGServiceGen.getGeneratorConfig(config => {
                config.name = name;
                let ngService = new NGServiceGen(config);
                ngService.generate();
            });
            break;
        case 'form':
            NGFormGen.getGeneratorConfig(config => {
                config.name = name;
                config.writeToFile = true;
                let ngForm = new NGFormGen(config);
                ngForm.generate();
            });
            break;
        case 'sass':
            let sass = new SassGen(args[1], args[0]);
            sass.generate();
            break;
        default:
            Log.error(`Invalid generator option ${type}`);
    }
}

function initProject(args:Array<String>) {
    if (args.length) {
        if (args.indexOf('docker-compose') >= 0) return DockerUtil.installCompose();
        if (args.indexOf('docker') >= 0) return DockerUtil.installEngine();
    }
    Util.prompt<{initType:string}>(<Question>{
        name: 'initType',
        message: 'Choose one of the following operations',
        type: 'list',
        choices: ['Install Docker', 'Install DockerCompose']
    })
        .then(answer=> {
            switch (answer.initType) {
                case 'Install Docker':
                    DockerUtil.installEngine();
                    break;
                case 'Install DockerCompose':
                    DockerUtil.installCompose();
                    break;
            }
        })
}

function deployProject(args:Array<string>) {
    Deployer.getDeployConfig(args)
        .then(config=> {
            let deployer = new Deployer(config);
            deployer.deploy();
        })
}

function backupProject(args:Array<string>) {
    Backuper.getDeployConfig(args)
        .then(config=> {
            let backuper = new Backuper(config);
            backuper.backup();
        })
}