"use strict";
var TsdGen = (function () {
    function TsdGen() {
    }
    TsdGen.getExecStatement = function () {
        return 'tsd install --resolve';
    };
    return TsdGen;
}());
exports.TsdGen = TsdGen;
