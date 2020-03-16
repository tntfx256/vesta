import { PlatformConfig } from "../PlatformConfig";
import { Log } from "../util/Log";
import { GitGen } from "./GitGen";
import { IExtProjectConfig } from "./ProjectGen";

export interface IClientAppConfig {}

export class ClientAppGen {
  constructor(protected config: IExtProjectConfig) {}

  public generate() {
    this.cloneTemplate();
  }

  private cloneTemplate() {
    const dir = this.config.name;
    const templateRepo = PlatformConfig.getRepository();
    try {
      GitGen.clone(templateRepo.client, dir);
    } catch (e) {
      Log.error(e);
      process.exit();
    }
  }
}
