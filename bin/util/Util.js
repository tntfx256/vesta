"use strict";
var colors = require("colors");
var path = require("path");
var fse = require("fs-extra");
var shell = require("shelljs");
var inquirer = require("inquirer");
var Util = (function () {
    function Util() {
    }
    Util.setMode = function (mode) {
        Util.config.mode = mode;
    };
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
        Util.log.error("File not found @" + filePath);
    };
    Util.fileHasContent = function (filePath, pattern) {
        if (fse.existsSync(filePath)) {
            var code = fse.readFileSync(filePath, { encoding: 'utf8' });
            return code.indexOf(pattern) >= 0;
        }
        return false;
    };
    Util.execSync = function (command, wd) {
        if (wd === void 0) { wd = '.'; }
        if (Util.config.mode == Util.Mode.Development) {
            Util.log.info(wd + "/> " + command + " ");
        }
        return shell.exec(command, { cwd: wd, async: false });
    };
    Util.Mode = {
        Development: 1,
        Production: 2
    };
    Util.config = {
        mode: Util.Mode.Development
    };
    Util.log = {
        simple: function (message) {
            console.log(message);
        },
        info: function (message) {
            Util.log.color('cyan', message);
        },
        error: function (message) {
            Util.log.color('red', message);
        },
        warning: function (message) {
            Util.log.color('yellow', message);
        },
        success: function (message) {
            Util.log.color('green', message);
        },
        color: function (color, message) {
            console.log(colors[color](message));
        }
    };
    Util.fs = {
        mkdir: function () {
            var dirs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                dirs[_i - 0] = arguments[_i];
            }
            dirs.forEach(function (dir) {
                try {
                    fse.mkdirpSync(dir);
                }
                catch (e) {
                    Util.log.error("mkdir: " + e.message);
                }
            });
        },
        writeFile: function (path, content) {
            try {
                fse.writeFileSync(path, content);
            }
            catch (e) {
                Util.log.error("writeFile: " + e.message);
            }
        },
        copy: function (src, dest) {
            try {
                fse.copySync(src, dest);
            }
            catch (e) {
                Util.log.error("copy: " + e.message);
            }
        },
        rename: function (src, dest) {
            try {
                fse.renameSync(src, dest);
            }
            catch (e) {
                Util.log.error("rename: " + e.message);
            }
        },
        remove: function (path) {
            try {
                fse.removeSync(path);
            }
            catch (e) {
                Util.log.error("remove: " + e.message);
            }
        }
    };
    return Util;
}());
exports.Util = Util;
