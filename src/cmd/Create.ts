import {IProjectConfig, ProjectGen, ProjectType} from "../gen/ProjectGen";
import {Log} from "../util/Log";
import {ArgParser} from "../util/ArgParser";

export class Create {

    static init() {
        const argParser = ArgParser.getInstance();
        if (argParser.hasHelp()) {
            return Create.help();
        }
        let name = argParser.get();
        if (!name || !name.match(/^[a-z][a-z0-9-]+/i)) {
            return Log.error('projectName may only contains [letters, numbers, dash]');
        }
        const projectConfig: IProjectConfig = <IProjectConfig>{
            name,
            pkgManager: argParser.get('--pkg-manager', 'npm', ['npm', 'yarn'])
        };
        let type: ProjectType = null;
        switch (argParser.get('--type')) {
            case 'api':
                type = ProjectType.ApiServer;
                projectConfig.server = {};
                break;
            case 'cpanel':
                type = ProjectType.ControlPanel;
                projectConfig.client = {};
                break;
            case 'client':
                type = ProjectType.ClientApplication;
                projectConfig.client = {};
                break;
            default:
                return Log.error("Invalid project type.\nSee 'vesta create --help'");
        }
        let mainRepo = argParser.get('--main-repo');
        if (mainRepo) {
            projectConfig.repository = {
                main: mainRepo
            };
            let cmnRepo = argParser.get('--cmn-repo');
            if (cmnRepo) {
                projectConfig.repository.common = cmnRepo;
            }
        }
        (new ProjectGen(projectConfig)).generate();
    }

    static help() {
        Log.write(`
Usage: vesta create <PROJECT_NAME> [options...]

Creating new project after asking a series of questions through interactive shell

    PROJECT_NAME    The name of the project

Options:
    --type          Type of project [client, cpanel, api]       {default: client}
    --pkg-manager   Type of node package manager [npm, yarn]    {default: npm}
    --main-repo     Address of the main repository
    --cmn-repo      Address of the common repository
    -h,--help       Display this help
`);
    }
}