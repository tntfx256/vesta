import {ProjectGen, IProjectGenConfig} from "../gen/ProjectGen";

export class Create {

    private static createProject(name: string) {
        let [projectCategory, projectName] = name.split('/');
        if (!projectName) {
            projectName = projectCategory;
            projectCategory = '';
        }
        if (!projectName.match(/^[a-z][a-z0-9-_]+/i)) {
            return console.error('projectName may only contains [letters, numbers, dash, underscore]');
        }
        projectName = _.camelCase(projectName);
        ProjectGen.getGeneratorConfig(projectName, projectCategory)
            .then((config: IProjectGenConfig) => {
                let project = new ProjectGen(config);
                project.generate();
            })
    }

    static parse(args: Array<string>) {
        if (!args.length || ['-h', '--help', 'help'].indexOf(args[0]) >= 0) {
            return Create.help();
        }
        Create.createProject(args[0]);
    }

    static help() {
        process.stdout.write(`
Usage: vesta create [options...] PROJECT_NAME

Creating new project after asking a series of questions through interactive shell

    PROJECT_NAME    The name of the project

Options:
    -h,--help       Display this help
`);
    }
}