import {IProjectConfig, ProjectGen} from "../gen/ProjectGen";
import {GitGen} from "../gen/file/GitGen";
import {Log} from "../util/Log";

export class Create {

    private static createProject(name: string) {
        if (name.length && !name.match(/^[a-z][a-z0-9-_]+/i)) {
            return Log.error('projectName may only contains [letters, numbers, dash, underscore]');
        }
        ProjectGen.getGeneratorConfig(name)
            .then(config => {
                return GitGen.getGeneratorConfig(name)
                    .then(repoConfig => {
                        config.name = repoConfig.main ? GitGen.getRepoName(repoConfig.main) : config.name;
                        config.repository = repoConfig;
                        return config;
                    })
            })
            .then((config: IProjectConfig) => {
                let project = new ProjectGen(config);
                project.generate();
            })
    }

    static parse(args: Array<string>) {
        if (['-h', '--help', 'help'].indexOf(args[0]) >= 0) {
            return Create.help();
        }
        Create.createProject(args.length ? args[0] : '');
    }

    static help() {
        Log.write(`
Usage: vesta create [options...] PROJECT_NAME

Creating new project after asking a series of questions through interactive shell

    PROJECT_NAME    The name of the project

Options:
    -h,--help       Display this help
`);
    }
}