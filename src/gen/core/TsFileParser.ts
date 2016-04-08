import * as fs from "fs-extra";
import {TsFileGen} from "./TsFileGen";

export class TsFileParser {
    private content:string;
    private parsed:TsFileGen;
    private tokens:Array<string> = [];
    private index:number = 0;

    constructor(filePath:string) {
        this.content = fs.readFileSync(filePath, {encoding: 'utf8'});
        this.parse();
    }

    private parse() {
        var token = '';
        this.tokenize();
        while (token = this.getNextToken()) {
            console.log(token);
        }
    }

    private tokenize() {
        var tokens = this.content.replace(/\n/g, '');//.replace(//);
        for (var i = 0, il = tokens.length; i < il; ++i) {
            if (tokens[i]) {
                this.tokens.push(tokens[i]);
            }
        }
        console.log(this.tokens.join('\n'));
    }

    private getNextToken() {
        return '';
    }
}