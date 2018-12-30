import { findInFileAndReplace } from "../util/Util";
import { IExtProjectConfig } from "./ProjectGen";
import { Vesta } from "./Vesta";

// tslint:disable-next-line:no-var-requires
const speakeasy = require("speakeasy");

export class DockerGen {

    constructor(private config: IExtProjectConfig) {
    }

    public compose() {
        if (Vesta.isApiServer) {
            const replace: any = {
                __DB_PASSWORD__: speakeasy.generateSecret({ length: 16, symbols: false }).ascii,
                __SALT__: speakeasy.generateSecret({ length: 8, symbols: false }).ascii.replace(/\$/g, "-"),
                __SECRET_KEY__: speakeasy.generateSecret({ length: 64 }).ascii.replace(/\$/g, "-"),
            };
            findInFileAndReplace(`${this.config.name}/vesta/docker-compose.yml`, replace);
        }
    }
}
