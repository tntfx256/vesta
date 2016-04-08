"use strict";
var BowerGen = (function () {
    function BowerGen() {
    }
    BowerGen.getExecStatement = function () {
        return 'bower install';
    };
    return BowerGen;
}());
exports.BowerGen = BowerGen;
