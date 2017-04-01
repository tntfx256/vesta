import {Deployer} from "../deploy/Deployer";

export class Deploy {

    static deployProject(args: Array<string>) {
        Deployer.getDeployConfig(args)
            .then(config => {
                let deployer = new Deployer(config);
                deployer.deploy();
            })
    }

    static parse(args: Array<string>) {
        if (!args.length || ['-h', '--help', 'help'].indexOf(args[0]) >= 0) {
            return Deploy.help();
        }
        Deploy.deployProject(args);
    }

    static help() {
        process.stdout.write(`
Usage: vesta deploy [options...] PATH

Deploy a project from remote repository

    PATH        The url to the git repository or The name of file 
                  that the previous deploy generates it
Options:
    --branch    Name of the git branch that deploy operation should use. [default master]
`);
    }
}