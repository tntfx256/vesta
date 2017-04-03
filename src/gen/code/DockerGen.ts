import {Util} from "../../util/Util";
import {IProjectConfig, ProjectGen} from "../ProjectGen";
import {V2App} from "../app/V2App";
let speakeasy = require('speakeasy');

export class DockerGen {

    constructor(private config: IProjectConfig) {
    }

    public compose() {
        let replace: any = {};
        if (V2App.isActive || this.config.type == ProjectGen.Type.ServerSide) {
            replace = {
                '__DB_PASSWORD__': speakeasy.generateSecret({length: 16, symbols: false}).ascii,
                '__SALT__': speakeasy.generateSecret({length: 8, symbols: false}).ascii.replace(/\$/g, '-'),
                '__SECRET_KEY__': speakeasy.generateSecret({length: 64}).ascii.replace(/\$/g, '-')
            };
        }
        Util.findInFileAndReplace(`${this.config.name}/resources/docker/docker-compose.yml`, replace);
        let devPath = V2App.isActive ? '/vesta/server' : '';
        Util.findInFileAndReplace(`${this.config.name}${devPath}/docker-compose.yml`, replace);
    }
}