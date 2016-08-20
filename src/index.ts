#! /usr/bin/env node
import * as fs from "fs-extra";
import * as path from "path";
import {Create} from "./cmd/Create";
import {Init} from "./cmd/Init";
import {Gen} from "./cmd/Gen";
import {Update} from "./cmd/Update";
import {Deploy} from "./cmd/Deploy";
import {Backup} from "./cmd/Backup";
import {Docker} from "./cmd/Docker";

let args = process.argv;
args.shift();
args.shift();
let command = args.shift();

if (['-v', '--version', 'version'].indexOf(command) >= 0) {
    let packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), {encoding: 'utf8'}));
    process.stdout.write(`Vesta Platform v${packageInfo.version}`);
    process.exit(0);
}

if (!command || ['-h', '--help', 'help'].indexOf(command) >= 0) {
    process.stdout.write(`
Usage: vesta COMMAND [args...]
       vesta [ --help | --version ]

Vesta platform command line

Options:
    -h, --help      Displays this help
    -v, --version   Displays the version of vesta platform

Commands:
    init            Preparing a server (ubuntu 14.4 and up) 
    create          Creating new project
    gen             Generate code for mentioned type
    deploy          Deploy a project from remote repository
    backup          Backup all storage data into a single tar file
    docker          Manage docker relevant operations
    update          Updates a package to it's latest version

Run 'vesta COMMAND --help' for more information on COMMAND
`);
    process.exit(0);
}

switch (command) {
    case 'init':
        Init.parse(args);
        break;
    case 'create':
        Create.parse(args);
        break;
    case 'gen':
        Gen.parse(args);
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
    default:
        process.stderr.write(`vesta: '${command}' is not a vesta command\nSee 'Vesta --help'\n`);
}