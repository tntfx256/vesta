"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AbstractStructureGen_1 = require("./AbstractStructureGen");
var ClassGen = (function (_super) {
    __extends(ClassGen, _super);
    function ClassGen(name, isAbstract) {
        if (isAbstract === void 0) { isAbstract = false; }
        _super.call(this, name);
        this.name = name;
        this.isAbstract = isAbstract;
        this.mixins = [];
    }
    ClassGen.prototype.addMethod = function (name, access, isStatic, isAbstract) {
        if (access === void 0) { access = ClassGen.Access.Public; }
        if (isStatic === void 0) { isStatic = false; }
        if (isAbstract === void 0) { isAbstract = false; }
        var method = _super.prototype.addMethod.call(this, name);
        method.setAccessType(access);
        method.setAsStatic(isStatic);
        method.setAsAbstract(isAbstract);
        return method;
    };
    ClassGen.prototype.addMixin = function (name, code) {
        this.mixins.push({ name: name, code: code });
    };
    ClassGen.prototype.setAsAbstract = function (isAbstract) {
        if (isAbstract === void 0) { isAbstract = true; }
        this.isAbstract = isAbstract;
    };
    ClassGen.prototype.getPropertiesCode = function () {
        var codes = [];
        for (var i = 0, il = this.properties.length; i < il; ++i) {
            var code = (this.properties[i].access ? this.properties[i].access : 'public') + ' ';
            if (this.properties[i].isStatic)
                code += 'static ';
            code += this.properties[i].name;
            if (this.properties[i].isOptional)
                code += '?';
            if (this.properties[i].type)
                code += ": " + this.properties[i].type;
            if (this.properties[i].defaultValue)
                code += " = " + this.properties[i].defaultValue;
            code += ';';
            codes.push(code);
        }
        return codes.join('\n    ');
    };
    ClassGen.prototype.generate = function () {
        var exp = this.shouldBeExported ? 'export ' : '', abs = this.isAbstract ? ' abstract ' : '';
        var code = "\n" + exp + abs + "class " + this.name;
        if (this.parentClass)
            code += ' extends ' + this.parentClass;
        if (this.implementations.length) {
            code += ' implements ' + this.implementations.join(', ');
        }
        code += ' {\n';
        if (this.properties.length)
            code += "    " + this.getPropertiesCode() + "\n";
        if (this.constructorMethod) {
            code += this.constructorMethod.generate();
        }
        for (var i = 0, il = this.methods.length; i < il; ++i) {
            code += "\n" + this.methods[i].generate();
        }
        this.mixins.forEach(function (mixin) {
            code += mixin.code;
        });
        code += '}';
        return code;
    };
    ClassGen.Access = {
        Public: 'public',
        Private: 'private',
        Protected: 'protected'
    };
    return ClassGen;
}(AbstractStructureGen_1.AbstractStructureGen));
exports.ClassGen = ClassGen;
