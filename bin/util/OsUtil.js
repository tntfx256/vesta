"use strict";
var CmdUtil_1 = require("./CmdUtil");
var OsUtil = (function () {
    function OsUtil() {
    }
    OsUtil.getOsVersion = function () {
        var output = CmdUtil_1.CmdUtil.execSync("lsb_release -a").output;
        console.log(output.split('\n'));
    };
    OsUtil.getOsCodeName = function () {
        return CmdUtil_1.CmdUtil.getOutputOf("lsb_release -c").split(':')[1].trim();
    };
    return OsUtil;
}());
exports.OsUtil = OsUtil;
