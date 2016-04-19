"use strict";
var shell = require("shelljs");
var Log_1 = require("./Log");
var Cmd = (function () {
    function Cmd() {
    }
    Cmd.execSync = function (command, options) {
        options = options || {};
        if (!options.silent) {
            Log_1.Log.info((options.cwd || '.') + "/> " + command + " ");
        }
        return shell.exec(command, options);
    };
    return Cmd;
}());
exports.Cmd = Cmd;
