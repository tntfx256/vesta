import { existsSync } from "fs";
import { Deployer, IDeployConfig } from "../deploy/Deployer";
import { ArgParser } from "../util/ArgParser";
import { readJsonFile, writeFile } from "../util/FsUtil";
import { Log } from "../util/Log";

export class Deploy {
  public static help() {
    Log.write(`
Usage: vesta deploy <PATH> [options...]

Deploy a project from remote repository

    PATH        The url to the git repository or The name of file
                  that the previous deploy generates it
Options:
    --branch    Name of the git branch that deploy operation should use {default: master}
`);
  }

  public static init() {
    const argParser = ArgParser.getInstance();
    if (argParser.hasHelp()) {
      return Deploy.help();
    }
    const config: IDeployConfig = {
      args: [],
      deployPath: `app`,
      history: [],
    } as IDeployConfig;
    config.branch = argParser.get("branch", "master");
    const path = argParser.get();
    if (!path) {
      return Log.error("Invalid file name or address of remote repository");
    }
    if (existsSync(path)) {
      const prevDeployConfig = readJsonFile<IDeployConfig>(path);
      if (!prevDeployConfig) {
        return;
      }
      Object.assign(config, prevDeployConfig);
    } else {
      config.repositoryUrl = path;
      config.projectName = Deploy.getProjectName(config.repositoryUrl);
    }
    new Deployer(config).deploy();
    // saving config file
    const date = new Date();
    config.history.push({ date: date.toISOString(), type: "deploy", branch: config.branch });
    writeFile(`${config.projectName}.json`, JSON.stringify(config, null, 2));
  }

  private static getProjectName(url: string) {
    const [, group, project] = /.+\/(.+)\/(.+)\.git$/.exec(url);
    return `${group}-${project}`;
  }
}
