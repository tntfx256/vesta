import {Question} from "inquirer";
import {DockerUtil} from "../util/DockerUtil";
import {Log} from "../util/Log";
import {ArgParser} from "../util/ArgParser";
import {ask} from "../util/Util";

export class Init {

    static initProject() {
        ask<{ initType: string }>(<Question>{
            name: 'initType',
            message: 'Choose one of the following operations',
            type: 'list',
            choices: ['Install Docker', 'Install DockerCompose']
        })
            .then(answer => {
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

    static init() {
        const argParser = ArgParser.getInstance();
        if (argParser.hasHelp()) {
            return Init.help();
        }
        if (argParser.has('--docker-compose')) return DockerUtil.installCompose();
        if (argParser.has('--docker')) return DockerUtil.installEngine();
        Init.initProject();
    }

    static help() {
        Log.write(`
Usage: vesta init [options...]

Preparing a server (ubuntu 14.4 and up)

Options:
    --docker            Installs the docker engine
    --docker-compose    Installs the docker compose
    -h,--help           Display this help
`);
    }
}
