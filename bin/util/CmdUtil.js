"use strict";
var shell = require("shelljs");
var Log_1 = require("./Log");
var StringUtil_1 = require("./StringUtil");
var CmdUtil = (function () {
    function CmdUtil() {
    }
    CmdUtil.execSync = function (command, options) {
        options = options || {};
        if (!options.silent) {
            Log_1.Log.info((options.cwd || '.') + "/> " + command + " ");
        }
        return shell.exec(command, options);
    };
    CmdUtil.getOutputOf = function (command, options) {
        return StringUtil_1.StringUtil.trimLineBreaks(CmdUtil.execSync(command, options).output);
    };
    return CmdUtil;
}());
exports.CmdUtil = CmdUtil;
