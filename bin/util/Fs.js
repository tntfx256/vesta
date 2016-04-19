"use strict";
var fse = require("fs-extra");
var Log_1 = require("./Log");
var Fs = (function () {
    function Fs() {
    }
    Fs.mkdir = function () {
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
    Fs.writeFile = function (path, content) {
        try {
            fse.writeFileSync(path, content);
        }
        catch (e) {
            Log_1.Log.error("writeFile: " + e.message);
        }
    };
    Fs.copy = function (src, dest) {
        try {
            fse.copySync(src, dest);
        }
        catch (e) {
            Log_1.Log.error("copy: " + e.message);
        }
    };
    Fs.rename = function (src, dest) {
        try {
            fse.renameSync(src, dest);
        }
        catch (e) {
            Log_1.Log.error("rename: " + e.message);
        }
    };
    Fs.remove = function (path) {
        try {
            fse.removeSync(path);
        }
        catch (e) {
            Log_1.Log.error("remove: " + e.message);
        }
    };
    return Fs;
}());
exports.Fs = Fs;
