import {Vesta} from "../../file/Vesta";
import {IProjectGenConfig} from "../../ProjectGen";

export class ExpressAppGen {
    private vesta:Vesta;

    constructor(private config:IProjectGenConfig) {
        this.vesta = Vesta.getInstance();
    }
}
