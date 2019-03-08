#! /usr/bin/env node
import { join } from "path";
import { UpdateNotifier } from "update-notifier";
import { Backup } from "./cmd/Backup";
import { Create } from "./cmd/Create";
import { Deploy } from "./cmd/Deploy";
import { Docker } from "./cmd/Docker";
import { Gen } from "./cmd/Gen";
import { Init } from "./cmd/Init";
import { Module } from "./cmd/Module";
import { Update } from "./cmd/Update";
import { PlatformConfig } from "./PlatformConfig";
import { ArgParser } from "./util/ArgParser";
import { readJsonFile } from "./util/FsUtil";
import { Log } from "./util/Log";

const argParser = ArgParser.getInstance();
const command = argParser.get();

// notifying user if new version is available
const packageInfo = readJsonFile<any>(join(__dirname, "../package.json"));
const notifier = new UpdateNotifier({ pkg: packageInfo });
notifier.notify();

if (!command) {
    if (argParser.has("--version", "-v")) {
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
    backup          Backup all storage data into a single tar file
    create          Creating new project
    deploy          Deploy a project from remote repository
    docker          Manage docker relevant operations
    eject           Eject a vesta module for direct source code manipulation
    gen             Generate code for mentioned type
    init            Initiating a vesta project from existing code and Managing server (Ubuntu)
    module          Creating new module for vesta platform
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
PlatformConfig.init(packageInfo.vesta);

switch (command) {
    case "backup":
        Backup.init();
        break;
    case "create":
        Create.init();
        break;
    case "deploy":
        Deploy.init();
        break;
    case "docker":
        Docker.init();
        break;
    case "gen":
        Gen.init();
        break;
    case "init":
        Init.init();
        break;
    case "module":
        Module.init();
        break;
    case "update":
        Update.init();
        break;
    default:
        const error = command ? `'${command}' is not a vesta command` : "";
        Log.error(`vesta: ${error}See 'Vesta --help'`);
}

process.on("unhandledRejection", (error: Error) => {
    Log.error(`\nAn unhandledRejection occurred:\n ${error.message}`);
});
