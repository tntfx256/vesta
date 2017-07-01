import * as fs from "fs-extra";
import {GitGen} from "../gen/file/GitGen";
import {execute} from "../util/CmdUtil";
import {mkdir, remove, rename} from "../util/FsUtil";

export interface IDeployHistory {
    date: string;
    type: 'deploy' | 'backup';
    branch?: string;
}
/**
 * projectName      ProjectGroupName-projectName (automatic)
 * deployPath       app/ProjectGroupName-projectName (automatic)
 * repositoryUrl    Url to the project repository
 * args             Extra argument to be passed to deploy script
 */
export interface IDeployConfig {
    projectName: string;
    deployPath: string;
    repositoryUrl: string;
    branch: string;
    history: Array<IDeployHistory>;
    args: Array<string>;
}

export class Deployer {
    private cloningPath: string;
    private alreadyCloned: boolean = false;

    constructor(private config: IDeployConfig) {
        this.cloningPath = config.projectName;
        if (fs.existsSync(this.cloningPath)) {
            this.alreadyCloned = true;
        } else {
            mkdir(config.deployPath);
        }
    }

    public deploy() {
        let deployPath = `${this.config.deployPath}/${this.config.projectName}`;
        let args = [this.cloningPath, deployPath];
        args = args.concat(this.config.args);
        remove(this.cloningPath);
        GitGen.clone(this.config.repositoryUrl, this.cloningPath);
        execute(`git checkout ${this.config.branch}`, {cwd: this.cloningPath});
        if (this.config.branch != 'master') {
            execute(`git pull`, {cwd: this.cloningPath});
        }
        rename(`${this.cloningPath}/resources/ci/deploy.sh`, `${this.cloningPath}/deploy.sh`);
        execute(`chmod +x ${this.cloningPath}/deploy.sh`);
        execute(`${process.cwd()}/${this.cloningPath}/deploy.sh ${args.join(' ')}`);
        remove(this.cloningPath);
    }


}