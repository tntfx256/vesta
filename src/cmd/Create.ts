import { GitGen } from "../gen/file/GitGen";
import { IExtProjectConfig, IProjectConfig, ProjectGen, ProjectType } from "../gen/ProjectGen";
import { ArgParser } from "../util/ArgParser";
import { Log } from "../util/Log";

export class Create {

    public static init() {
        const argParser = ArgParser.getInstance();
        if (argParser.hasHelp()) {
            return Create.help();
        }
        const name = argParser.get();
        if (!name || !name.match(/^[a-z][a-z0-9-]+/i)) {
            return Log.error("projectName may only contains [letters, numbers, dash]");
        }
        const projectConfig: IProjectConfig = { name } as IExtProjectConfig;
        switch (argParser.get("--type")) {
            case "api":
                projectConfig.type = ProjectType.ApiServer;
                projectConfig.server = {};
                break;
            case "admin":
            case "client":
                projectConfig.type = ProjectType.ClientApplication;
                projectConfig.client = {};
                break;
            default:
                return Log.error("Invalid project type.\nSee 'vesta create --help'\n");
        }
        const mainRepo = argParser.get("--main-repo");
        if (mainRepo) {
            projectConfig.repository = {
                main: mainRepo,
            };
            const cmnRepo = argParser.get("--cmn-repo");
            if (cmnRepo) {
                projectConfig.repository.common = cmnRepo;
                if (argParser.has("--create-cmn")) {
                    GitGen.commonProjectExists = false;
                }
            }
        }
        (new ProjectGen(projectConfig)).generate();
    }

    public static help() {
        Log.write(`
Usage: vesta create <PROJECT_NAME> [options...]

Creating new project based on the provided options

    PROJECT_NAME    The name of the project

Options:
    --type          Type of project [client, admin, api]       {default: client}
    --main-repo     Address of the main repository
    --cmn-repo      Address of the common repository
    --create-cmn    Create common repository (Only the first time)
    -h,--help       Display this help

Example:
    // creating a backend project
    vesta create test-api --type=api

    // creating a complete project with api, client, and admin panel
    vesta create api    --type=api    --main-repo=https://git.my/repo/api.git    --cmn-repo=https://git.my/repo/cmn.git --create-cmn
    vesta create client --type=client --main-repo=https://git.my/repo/client.git --cmn-repo=https://git.my/repo/cmn.git
    vesta create admin  --type=admin  --main-repo=https://git.my/repo/admin.git  --cmn-repo=https://git.my/repo/cmn.git
`);
    }
}
