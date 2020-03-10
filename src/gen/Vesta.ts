import { existsSync } from "fs";

export interface IStructure {
  app: string;
  cmn: string;
  components: string;
  controllers: string;
  model: string;
  sass: string;
  temp: string;
}

export class Vesta {
  private static dirs: IStructure;

  public static get isClientApplication(): boolean {
    return !Vesta.isApiServer;
  }

  public static get isApiServer(): boolean {
    return existsSync(`${process.cwd()}/src/api`);
  }

  public static get directories(): IStructure {
    if (!Vesta.dirs) {
      Vesta.setStructures();
    }
    return Vesta.dirs;
  }

  private static setStructures() {
    Vesta.dirs = {} as IStructure;
    if (existsSync(`${process.cwd()}/src/client/app/cmn`)) {
      Vesta.dirs = {
        app: "src/client/app",
        cmn: "src/client/app/cmn",
        components: "src/client/app/components",
        controllers: `src/api/v1/controllers`,
        model: "src/client/app/cmn/models",
        sass: "src/client/app/scss",
        temp: "vesta/tmp",
      };
    } else if (existsSync(`${process.cwd()}/src/app/cmn`)) {
      Vesta.dirs = {
        app: "src/app",
        cmn: "src/app/cmn",
        components: "src/app/components",
        controllers: `src/api/v1/controllers`,
        model: "src/app/cmn/models",
        sass: "src/app/scss",
        temp: "vesta/tmp",
      };
    } else if (existsSync(`${process.cwd()}/src/cmn`)) {
      Vesta.dirs = {
        app: "src",
        cmn: "src/cmn",
        components: "src/components",
        controllers: `src/api/v1/controllers`,
        model: "src/cmn/models",
        sass: "src/components",
        temp: "tmp",
      };
    } else {
      Vesta.dirs = {
        app: "src",
        cmn: "src/cmn",
        components: "src/components",
        controllers: `src/controllers`,
        model: "src/models",
        sass: "src/components",
        temp: "tmp",
      };
    }
  }
}
