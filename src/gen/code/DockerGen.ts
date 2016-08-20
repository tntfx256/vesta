import {Util} from "../../util/Util";
import {IProjectGenConfig, ProjectGen} from "../ProjectGen";
var speakeasy = require('speakeasy');

export class DockerGen {

    constructor(private config: IProjectGenConfig) {
    }

    public compose() {
        var replace: any = {};
        if (this.config.type == ProjectGen.Type.ClientSide) {

        } else {
            replace = {
                '__DB_PASSWORD__': speakeasy['generate_key']({length: 16, symbols: false}).ascii,
                '__SALT__': speakeasy['generate_key']({length: 24}).ascii.replace(/\$/g, '-'),
                '__SECRET_KEY__': speakeasy['generate_key']({length: 64}).ascii.replace(/\$/g, '-')
            };
        }
        Util.findInFileAndReplace(`${this.config.name}/resources/docker/docker-compose.yml`, replace);
        Util.findInFileAndReplace(`${this.config.name}/docker-compose.yml`, replace);
    }
}