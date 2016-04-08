"use strict";
var _ = require('lodash');
var ClassGen_1 = require("./ClassGen");
var Util_1 = require("../../util/Util");
var MethodGen = (function () {
    function MethodGen(name) {
        if (name === void 0) { name = ''; }
        this.name = name;
        this.content = '';
        this.parameters = [];
        this.returnType = '';
        this.accessType = '';
        this.isConstructor = false;
        this.isStatic = false;
        this.isAbstract = false;
        this.shouldBeExported = false;
        this.isSimpleMethod = false;
        this.isInterface = false;
        if (!name) {
            this.isConstructor = true;
        }
        else {
            this.name = _.camelCase(name);
        }
    }
    MethodGen.prototype.setAsStatic = function (isStatic) {
        if (isStatic === void 0) { isStatic = true; }
        this.isStatic = isStatic;
    };
    MethodGen.prototype.setAsAbstract = function (isAbstract) {
        if (isAbstract === void 0) { isAbstract = true; }
        this.isAbstract = isAbstract;
    };
    MethodGen.prototype.setAccessType = function (access) {
        if (access === void 0) { access = ClassGen_1.ClassGen.Access.Public; }
        this.accessType = access;
    };
    MethodGen.prototype.isInterfaceMethod = function (isInterface) {
        if (isInterface === void 0) { isInterface = true; }
        this.isInterface = isInterface;
    };
    MethodGen.prototype.shouldExport = function (shouldBeExported) {
        if (shouldBeExported === void 0) { shouldBeExported = true; }
        this.shouldBeExported = shouldBeExported;
    };
    MethodGen.prototype.isSimple = function (isSimple) {
        if (isSimple === void 0) { isSimple = true; }
        this.isSimpleMethod = isSimple;
    };
    MethodGen.prototype.addParameter = function (parameter) {
        for (var i = this.parameters.length; i--;) {
            if (this.parameters[i].name == parameter.name) {
                return Util_1.Util.log.error("A parameter with the same name (" + parameter.name + ") already exists");
            }
        }
        this.parameters.push(parameter);
    };
    MethodGen.prototype.setReturnType = function (type) {
        this.returnType = ": " + type;
    };
    MethodGen.prototype.setContent = function (code) {
        this.content = code;
    };
    MethodGen.prototype.getContent = function () {
        return this.content;
    };
    MethodGen.prototype.appendContent = function (code) {
        this.content = this.content ? this.content + "\n        " + code : code;
    };
    MethodGen.prototype.prependContent = function (code) {
        this.content = code + (this.content ? "\n" + this.content : '');
    };
    MethodGen.prototype.getParameterCode = function () {
        var codes = [];
        for (var i = 0, il = this.parameters.length; i < il; ++i) {
            var parameter = this.parameters[i], code = '', access = '', type = parameter.type ? ": " + parameter.type : '', opt = parameter.isOptional ? '?' : '';
            if (this.isConstructor) {
                var access = parameter.access ? (parameter.access + ' ') : '';
                code = "" + access + parameter.name + opt + type;
            }
            else {
                code = "" + parameter.name + opt + type;
            }
            if (!this.isInterface && parameter.defaultValue) {
                code += " = " + parameter.defaultValue;
            }
            codes.push(code);
        }
        return codes.join(', ');
    };
    MethodGen.prototype.generate = function () {
        var parametersCode = this.getParameterCode();
        if (this.isInterface) {
            return this.interfaceMethodGen(parametersCode);
        }
        else if (this.isSimpleMethod) {
            return this.simpleMethodGen(parametersCode);
        }
        else if (this.shouldBeExported) {
            return this.exportedMethodGen(parametersCode);
        }
        return this.classMethodGen(parametersCode);
    };
    MethodGen.prototype.interfaceMethodGen = function (parametersCode) {
        if (this.isConstructor) {
            if (this.isInterface) {
                return "    new(" + parametersCode + ");";
            }
            return "\n    constructor(" + parametersCode + ") {\n        " + this.content + "\n    }";
        }
        // not a constructor
        if (this.isInterface) {
            return "    " + this.name + "(" + parametersCode + ")" + this.returnType + ";";
        }
        var st = this.isStatic ? ' static' : '';
        if (this.isAbstract) {
            return "    " + this.accessType + st + " " + this.name + "(" + parametersCode + ")" + this.returnType + ";";
        }
        return "    " + this.accessType + st + " " + this.name + "(" + parametersCode + ")" + this.returnType + " {\n        " + this.content + "\n    }";
    };
    MethodGen.prototype.classMethodGen = function (parametersCode) {
        if (this.isConstructor) {
            return "\n    constructor(" + parametersCode + ") {\n        " + this.content + "\n    }\n";
        }
        // not a constructor
        var st = this.isStatic ? ' static' : '';
        if (this.isAbstract) {
            return "    " + this.accessType + st + " " + this.name + "(" + parametersCode + ")" + this.returnType + ";\n";
        }
        return "    " + this.accessType + st + " " + this.name + "(" + parametersCode + ")" + this.returnType + " {\n        " + this.content + "\n    }\n";
    };
    MethodGen.prototype.exportedMethodGen = function (parametersCode) {
        return "export function " + this.name + "(" + parametersCode + ")" + this.returnType + " {\n    " + this.content + "\n}\n";
    };
    MethodGen.prototype.simpleMethodGen = function (parametersCode) {
        var exp = this.shouldBeExported ? 'export ' : '';
        return exp + "function " + this.name + "(" + parametersCode + ")" + this.returnType + " {\n    " + this.content + "\n}\n";
    };
    return MethodGen;
}());
exports.MethodGen = MethodGen;
