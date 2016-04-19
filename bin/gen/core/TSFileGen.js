"use strict";
var _ = require("lodash");
var path = require("path");
var ClassGen_1 = require("./ClassGen");
var InterfaceGen_1 = require("./InterfaceGen");
var EnumGen_1 = require("./EnumGen");
var MethodGen_1 = require("./MethodGen");
var Fs_1 = require("../../util/Fs");
var Log_1 = require("../../util/Log");
var TsFileGen = (function () {
    function TsFileGen(name) {
        this.name = name;
        this.refs = [];
        this.mixins = [];
        this.methods = [];
        this.enums = [];
        this.classes = [];
        this.interfaces = [];
        this.importStatements = [];
    }
    TsFileGen.prototype.addReference = function () {
        var _this = this;
        var refs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            refs[_i - 0] = arguments[_i];
        }
        refs.forEach(function (ref) {
            if (_this.refs.indexOf(ref) < 0) {
                _this.refs.push(ref);
            }
        });
    };
    /**
     * Module:      <code>import nameParameter from 'fromParameter'</code>
     * Require:     <code>import nameParameter = require('fromParameter')</code>
     * Legacy:      <code>var nameParameter = require('fromParameter')</code>
     * Namespace:   <code>import nameParameter = fromParameter</code>
     */
    TsFileGen.prototype.addImport = function (name, from, type) {
        if (type === void 0) { type = TsFileGen.ImportType.Module; }
        var statement = "import " + name + " ";
        switch (type) {
            case TsFileGen.ImportType.Require:
                statement += "= require('" + from + "');";
                break;
            case TsFileGen.ImportType.Namespace:
                statement += "= " + from + ";";
                break;
            case TsFileGen.ImportType.Legacy:
                statement = "var " + name + " = require('" + from + "');";
                break;
            default:
                statement += "from '" + from + "';";
        }
        if (this.importStatements.indexOf(statement) < 0) {
            this.importStatements.push(statement);
        }
    };
    TsFileGen.prototype.addClass = function (name, isAbstract) {
        if (!name) {
            name = this.name;
        }
        name = _.capitalize(_.camelCase(name));
        var clss = this.getClass(name);
        if (clss)
            return clss;
        clss = new ClassGen_1.ClassGen(name, isAbstract);
        this.classes.push(clss);
        return clss;
    };
    TsFileGen.prototype.getClass = function (name) {
        name = _.capitalize(_.camelCase(name));
        for (var i = this.classes.length; i--;) {
            if (this.classes[i].name == name) {
                return this.classes[i];
            }
        }
        return null;
    };
    TsFileGen.prototype.addInterface = function (name) {
        if (!name) {
            name = this.name;
        }
        name = _.capitalize(_.camelCase(name));
        if (name.charAt(0) != 'I')
            name = "I" + name;
        var intfc = this.getInterface(name);
        if (intfc)
            return intfc;
        intfc = new InterfaceGen_1.InterfaceGen(name);
        this.interfaces.push(intfc);
        return intfc;
    };
    TsFileGen.prototype.getInterface = function (name) {
        name = _.capitalize(_.camelCase(name));
        if (name.charAt(0) != 'I')
            name += "I" + name;
        for (var i = this.interfaces.length; i--;) {
            if (this.interfaces[i].name == name) {
                return this.interfaces[i];
            }
        }
        return null;
    };
    TsFileGen.prototype.addEnum = function (name) {
        name = _.capitalize(_.camelCase(name));
        var enm = this.getEnum(name);
        if (enm)
            return enm;
        enm = new EnumGen_1.EnumGen(name);
        this.enums.push(enm);
        return enm;
    };
    TsFileGen.prototype.getEnum = function (name) {
        name = _.capitalize(_.camelCase(name));
        for (var i = this.enums.length; i--;) {
            if (this.enums[i].name == name) {
                return this.enums[i];
            }
        }
        return null;
    };
    TsFileGen.prototype.addMethod = function (name) {
        name = _.camelCase(name);
        var method = this.getMethod(name);
        if (method)
            return method;
        method = new MethodGen_1.MethodGen(name);
        this.methods.push(method);
        return method;
    };
    TsFileGen.prototype.getMethod = function (name) {
        name = _.camelCase(name);
        for (var i = this.methods.length; i--;) {
            if (this.enums[i].name == name) {
                return this.methods[i];
            }
        }
        return null;
    };
    TsFileGen.prototype.addMixin = function (code, position) {
        if (position === void 0) { position = TsFileGen.CodeLocation.AfterImport; }
        this.mixins.push({ code: code, position: position });
    };
    TsFileGen.prototype.getMixin = function (position) {
        var code = '';
        for (var i = 0, il = this.mixins.length; i < il; ++i) {
            if (this.mixins[i].position == position) {
                code += "\n" + this.mixins[i].code;
            }
        }
        return code ? "\n" + code : '';
    };
    TsFileGen.prototype.getNewLine = function (code, double) {
        if (double === void 0) { double = false; }
        var nl = '';
        if (code) {
            nl += '\n';
            if (double)
                nl += '\n';
        }
        return nl;
    };
    TsFileGen.prototype.generate = function () {
        var code = '';
        code += this.refs.join('\n');
        code += this.importStatements.join('\n');
        code += this.getMixin(TsFileGen.CodeLocation.AfterImport);
        // enum
        for (var i = 0, il = this.enums.length; i < il; ++i) {
            code += this.getNewLine(code, true);
            code += this.enums[i].generate();
        }
        code += this.getMixin(TsFileGen.CodeLocation.AfterEnum);
        // interface
        for (var i = 0, il = this.interfaces.length; i < il; ++i) {
            code += this.getNewLine(code, true);
            code += this.interfaces[i].generate();
        }
        code += this.getMixin(TsFileGen.CodeLocation.AfterInterface);
        // classes
        for (var i = 0, il = this.classes.length; i < il; ++i) {
            code += this.getNewLine(code, true);
            code += this.classes[i].generate();
        }
        code += this.getMixin(TsFileGen.CodeLocation.AfterClass);
        // methods
        for (var i = 0, il = this.methods.length; i < il; ++i) {
            code += this.getNewLine(code, true);
            code += this.methods[i].generate();
        }
        code += this.getMixin(TsFileGen.CodeLocation.AfterMethod);
        return code;
    };
    TsFileGen.prototype.write = function (directory, ext) {
        if (ext === void 0) { ext = 'ts'; }
        try {
            Fs_1.Fs.writeFile(path.join(directory, this.name + "." + ext), this.generate());
        }
        catch (e) {
            Log_1.Log.error(e.message);
        }
    };
    TsFileGen.CodeLocation = { AfterImport: 1, AfterEnum: 2, AfterInterface: 3, AfterClass: 4, AfterMethod: 5 };
    TsFileGen.ImportType = { Module: 1, Require: 2, Legacy: 3, Namespace: 4 };
    return TsFileGen;
}());
exports.TsFileGen = TsFileGen;
