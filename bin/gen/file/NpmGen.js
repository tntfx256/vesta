"use strict";
var NpmGen = (function () {
    function NpmGen() {
    }
    NpmGen.getExecStatement = function () {
        return "npm install";
    };
    return NpmGen;
}());
exports.NpmGen = NpmGen;
