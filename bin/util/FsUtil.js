"use strict";
var fse = require("fs-extra");
var Log_1 = require("./Log");
var FsUtil = (function () {
    function FsUtil() {
    }
    FsUtil.mkdir = function () {
        var dirs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            dirs[_i - 0] = arguments[_i];
        }
        dirs.forEach(function (dir) {
            try {
                fse.mkdirpSync(dir);
            }
            catch (e) {
                Log_1.Log.error("mkdir: " + e.message);
            }
        });
    };
    ;
    FsUtil.readJsonFile = function (path) {
        try {
            return JSON.parse(fse.readFileSync(path, { encoding: 'utf8' }));
        }
        catch (e) {
            Log_1.Log.error("Invalid json file: " + path);
            return null;
        }
    };
    FsUtil.writeFile = function (path, content) {
        try {
            fse.writeFileSync(path, content);
        }
        catch (e) {
            Log_1.Log.error("writeFile: " + e.message);
        }
    };
    FsUtil.copy = function (src, dest) {
        try {
            fse.copySync(src, dest);
        }
        catch (e) {
            Log_1.Log.error("copy: " + e.message);
        }
    };
    FsUtil.rename = function (src, dest) {
        try {
            fse.renameSync(src, dest);
        }
        catch (e) {
            Log_1.Log.error("rename: " + e.message);
        }
    };
    FsUtil.remove = function (path) {
        try {
            fse.removeSync(path);
        }
        catch (e) {
            Log_1.Log.error("remove: " + e.message);
        }
    };
    return FsUtil;
}());
exports.FsUtil = FsUtil;
