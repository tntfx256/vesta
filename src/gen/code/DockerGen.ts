import {IProjectConfig, ProjectType} from "../ProjectGen";
import {Vesta} from "../file/Vesta";
import {findInFileAndReplace} from "../../util/Util";
let speakeasy = require('speakeasy');

export class DockerGen {

    constructor(private config: IProjectConfig) {
    }

    public compose() {
        let replace: any = {};
        if (this.config.type == ProjectType.ApiServer) {
            replace = {
                '__DB_PASSWORD__': speakeasy.generateSecret({length: 16, symbols: false}).ascii,
                '__SALT__': speakeasy.generateSecret({length: 8, symbols: false}).ascii.replace(/\$/g, '-'),
                '__SECRET_KEY__': speakeasy.generateSecret({length: 64}).ascii.replace(/\$/g, '-')
            };
        }
        if (Vesta.getInstance().isApiServer) {
            findInFileAndReplace(`${this.config.name}/vesta/docker-compose.yml`, replace);
        } else {
            findInFileAndReplace(`${this.config.name}/vesta/server/docker-compose.yml`, replace);
        }
        findInFileAndReplace(`${this.config.name}/resources/docker/docker-compose.yml`, replace);
    }
}