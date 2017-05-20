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
import {FsUtil} from "./util/FsUtil";
import {Log} from "./util/Log";
import {IPlatformConfig, PlatformConfig} from "./PlatformConfig";

let args = process.argv;
args.shift();
args.shift();
let command = args.shift();

const packageInfo = FsUtil.readJsonFile(path.join(__dirname, '../package.json'));

if (['-v', '--version', 'version'].indexOf(command) >= 0) {
    Log.write(`Vesta Platform v${packageInfo.version}\n`);
    process.exit(0);
}

if (!command || ['-h', '--help', 'help'].indexOf(command) >= 0) {
    Log.write(`
Usage: vesta COMMAND [args...]
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

Run 'vesta COMMAND --help' for more information on COMMAND
`);
    process.exit(0);
}
// initiating platform configuration
PlatformConfig.init(<IPlatformConfig>packageInfo.vesta);

switch (command) {
    // no need to vesta.json
    case 'init':
        Init.parse(args);
        break;
    case 'create':
        Create.parse(args);
        break;
    case 'module':
        Module.parse(args);
        break;
    case 'deploy':
        Deploy.parse(args);
        break;
    case 'backup':
        Backup.parse(args);
        break;
    case 'docker':
        Docker.parse(args);
        break;
    case 'update':
        Update.parse(args);
        break;
    // vesta.json must exist
    case 'gen':
        Gen.parse(args);
        break;
    default:
        Log.error(`vesta: '${command}' is not a vesta command\nSee 'Vesta --help'\n`);
}

process.on('unhandledRejection', err => {
    console.error('An unhandledRejection occurred:\n', err);
});