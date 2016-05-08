"use strict";
var path = require("path");
var fse = require("fs-extra");
var Log_1 = require("./Log");
var inquirer = require("inquirer");
var Util = (function () {
    function Util() {
    }
    Util.prompt = function (questions) {
        return new Promise(function (resolve) {
            inquirer.prompt(questions, function (answer) { return resolve(answer); });
        });
    };
    Util.plural = function (name) {
        var lastChar = name.charAt(name.length - 1).toLocaleLowerCase();
        if (['a', 'i', 'u'].indexOf(lastChar) >= 0) {
            return name + 'es';
        }
        if (['y'].indexOf(name.charAt(name.length - 1)) >= 0) {
            return name.substr(0, name.length - 1) + 'ies';
        }
        return name + 's';
    };
    Util.toJSON = function (object, prune) {
        if (prune === void 0) { prune = false; }
        var json = {};
        for (var key in object) {
            var value = object[key];
            if (object.hasOwnProperty(key) && 'function' != typeof value) {
                if (prune) {
                    var type = typeof object[key];
                    if (type == 'object') {
                        if (object['splice']) {
                            if (value.length)
                                json[key] = value;
                        }
                        else {
                            if (Object.keys(value).length)
                                json[key] = value;
                        }
                    }
                    else if (type == 'string') {
                        if (value)
                            json[key] = value;
                    }
                    else {
                        json[key] = value;
                    }
                }
                else {
                    json[key] = value;
                }
            }
        }
        return json;
    };
    Util.genRelativePath = function (from, to) {
        var relPath = path.relative(from, to).replace(/\\/g, '/').replace(/\.ts$/, '');
        if (relPath.charAt(0) != '.') {
            relPath = './' + relPath;
        }
        return relPath;
    };
    Util.joinPath = function () {
        var paths = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            paths[_i - 0] = arguments[_i];
        }
        return path.join.apply(path, paths).replace(/\\/g, '/');
    };
    Util.findInFileAndReplace = function (filePath, patternReplacePair, preventIfExists) {
        if (preventIfExists === void 0) { preventIfExists = false; }
        if (fse.existsSync(filePath)) {
            var code = fse.readFileSync(filePath, { encoding: 'utf8' });
            for (var pattern in patternReplacePair) {
                if (patternReplacePair.hasOwnProperty(pattern)) {
                    if (preventIfExists && code.indexOf(patternReplacePair[pattern]) >= 0) {
                        continue;
                    }
                    var regex = new RegExp(pattern, 'g');
                    code = code.replace(regex, patternReplacePair[pattern]);
                }
            }
            fse.writeFileSync(filePath, code);
            return;
        }
        Log_1.Log.error("File not found @" + filePath);
    };
    Util.fileHasContent = function (filePath, pattern) {
        if (fse.existsSync(filePath)) {
            var code = fse.readFileSync(filePath, { encoding: 'utf8' });
            return code.indexOf(pattern) >= 0;
        }
        return false;
    };
    return Util;
}());
exports.Util = Util;
