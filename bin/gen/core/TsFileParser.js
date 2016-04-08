"use strict";
var fs = require("fs-extra");
var TsFileParser = (function () {
    function TsFileParser(filePath) {
        this.tokens = [];
        this.index = 0;
        this.content = fs.readFileSync(filePath, { encoding: 'utf8' });
        this.parse();
    }
    TsFileParser.prototype.parse = function () {
        var token = '';
        this.tokenize();
        while (token = this.getNextToken()) {
            console.log(token);
        }
    };
    TsFileParser.prototype.tokenize = function () {
        var tokens = this.content.replace(/\n/g, ''); //.replace(//);
        for (var i = 0, il = tokens.length; i < il; ++i) {
            if (tokens[i]) {
                this.tokens.push(tokens[i]);
            }
        }
        console.log(this.tokens.join('\n'));
    };
    TsFileParser.prototype.getNextToken = function () {
        return '';
    };
    return TsFileParser;
}());
exports.TsFileParser = TsFileParser;
