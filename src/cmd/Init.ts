import { Question } from "inquirer";
import { ArgParser } from "../util/ArgParser";
import { DockerUtil } from "../util/DockerUtil";
import { Log } from "../util/Log";
import { ask } from "../util/Util";

export class Init {
  public static initProject() {
    ask<{ initType: string }>({
      choices: ["Install Docker", "Install DockerCompose"],
      message: "Choose one of the following operations",
      name: "initType",
      type: "list",
    }).then((answer) => {
      switch (answer.initType) {
        case "Install Docker":
          DockerUtil.installEngine();
          break;
        case "Install DockerCompose":
          DockerUtil.installCompose();
          break;
      }
    });
  }

  public static init() {
    const argParser = ArgParser.getInstance();
    if (argParser.hasHelp()) {
      return Init.help();
    }
    const subCommand = argParser.get();
    if (subCommand === "server") {
      if (argParser.has("docker-compose")) {
        return DockerUtil.installCompose();
      }
      if (argParser.has("docker")) {
        return DockerUtil.installEngine();
      }
    } else if (subCommand === "project") {
      //
    }
    Init.initProject();
  }

  public static help() {
    Log.write(`
Usage: vesta init <TYPE> [options...]

Types:
    server      Preparing a server (ubuntu 14.4 and up)
    project     Converting a project to vesta

Options:
    --docker            Installs the docker engine
    --docker-compose    Installs the docker compose
    -h,--help           Display this help
`);
  }
}
