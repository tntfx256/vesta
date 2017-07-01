#! /usr/bin/env node
import * as path from "path";
import {Create} from "./cmd/Create";
import {Init} from "./cmd/Init";
import {Gen} from "./cmd/Gen";
import {Update} from "./cmd/Update";
import {Deploy} from "./cmd/Deploy";
import {Backup} from "./cmd/Backup";
import {Docker} from "./cmd/Docker";
import {Module} from "./cmd/Module";
import {Log} from "./util/Log";
import {IPlatformConfig, PlatformConfig} from "./PlatformConfig";
import {ArgParser} from "./util/ArgParser";
import {readJsonFile} from "./util/FsUtil";

const argParser = ArgParser.getInstance();
let command = argParser.get();

const packageInfo = readJsonFile<any>(path.join(__dirname, '../package.json'));

if (!command) {
    if (argParser.has('--version', '-v')) {
        Log.write(`Vesta Platform v${packageInfo.version}\n`);
    } else if (argParser.hasHelp()) {
        Log.write(`
Vesta Platform v${packageInfo.version}

Usage: vesta <COMMAND> [args...]
       vesta [ --help | --version ]

Vesta platform command line

Options:
    -h, --help      Displays this help
    -v, --version   Displays the version of vesta platform

Commands:
    init            Initiating a vesta project from existing code and Managing server (Ubuntu)
    create          Creating new project
    module          Creating new module for vesta platform
    gen             Generate code for mentioned type
    deploy          Deploy a project from remote repository
    backup          Backup all storage data into a single tar file
    docker          Manage docker relevant operations
    update          Updates a package to it's latest version

Run 'vesta <COMMAND> --help' for more information on COMMAND

Attention:
    <arg>               Mandatory argument
    [arg]               Optional argument
    {default: value}    The default value if argument is not provided
`);
    }
    process.exit(0);
}
// initiating platform configuration
PlatformConfig.init(<IPlatformConfig>packageInfo.vesta);

switch (command) {
    // no need to vesta.json
    case 'init':
        Init.init();
        break;
    case 'create':
        Create.init();
        break;
    case 'module':
        Module.init(argParser);
        break;
    case 'deploy':
        Deploy.init(argParser);
        break;
    case 'backup':
        Backup.init(argParser);
        break;
    case 'docker':
        Docker.init(argParser);
        break;
    case 'update':
        Update.init(argParser);
        break;
    // vesta.json must exist
    case 'gen':
        Gen.init(argParser);
        break;
    default:
        let error = command ? `'${command}' is not a vesta command\n` : '';
        Log.error(`vesta: ${error}See 'Vesta --help'\n`);
}

process.on('unhandledRejection', err => {
    Log.error(`\nAn unhandledRejection occurred:\n ${err.message}`);
});