#! /usr/bin/env node
import { join } from "path";
import { Backup } from "./cmd/Backup";
import { Create } from "./cmd/Create";
import { Deploy } from "./cmd/Deploy";
import { Docker } from "./cmd/Docker";
import { Gen } from "./cmd/Gen";
import { Init } from "./cmd/Init";
import { Module } from "./cmd/Module";
import { Update } from "./cmd/Update";
import { Culture } from "./cmn/core/Culture";
import { UsDate } from "./cmn/culture/us/UsDate";
import { UsLocale } from "./cmn/culture/us/UsLocale";
import { IPlatformConfig, PlatformConfig } from "./PlatformConfig";
import { ArgParser } from "./util/ArgParser";
import { readJsonFile } from "./util/FsUtil";
import { Log } from "./util/Log";

Culture.register(UsLocale, {}, UsDate);
const argParser = ArgParser.getInstance();
const command = argParser.get();

const packageInfo = readJsonFile<any>(join(__dirname, "../package.json"));

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
PlatformConfig.init(packageInfo.vesta);

switch (command) {
    // no need to vesta.json
    case "init":
        Init.init();
        break;
    case "create":
        Create.init();
        break;
    case "module":
        Module.init();
        break;
    case "deploy":
        Deploy.init();
        break;
    case "backup":
        Backup.init();
        break;
    case "docker":
        Docker.init();
        break;
    case "update":
        Update.init();
        break;
    // vesta.json must exist
    case "gen":
        Gen.init();
        break;
    default:
        const error = command ? `'${command}' is not a vesta command` : "";
        Log.error(`vesta: ${error}See 'Vesta --help'`);
}

process.on("unhandledRejection", (error) => {
    Log.error(`\nAn unhandledRejection occurred:\n ${error.message}`);
});
