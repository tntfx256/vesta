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
            Log_1.Log.info("./> mkdir -p " + dir);
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
        Log_1.Log.info("./> cp " + src + " " + dest);
        try {
            fse.copySync(src, dest);
        }
        catch (e) {
            Log_1.Log.error("copy: " + e.message);
        }
    };
    FsUtil.rename = function (src, dest) {
        Log_1.Log.info("./> mv " + src + " " + dest);
        try {
            fse.renameSync(src, dest);
        }
        catch (e) {
            Log_1.Log.error("rename: " + e.message);
        }
    };
    FsUtil.remove = function () {
        var path = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            path[_i - 0] = arguments[_i];
        }
        path.forEach(function (p) {
            Log_1.Log.info("./> rm -rf " + p);
            try {
                fse.removeSync(p);
            }
            catch (e) {
                Log_1.Log.error("remove: " + e.message);
            }
        });
    };
    return FsUtil;
}());
exports.FsUtil = FsUtil;
