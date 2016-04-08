"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AbstractStructureGen_1 = require("./AbstractStructureGen");
var InterfaceGen = (function (_super) {
    __extends(InterfaceGen, _super);
    function InterfaceGen(name) {
        _super.call(this, name);
    }
    InterfaceGen.prototype.addMethod = function (name) {
        var method = _super.prototype.addMethod.call(this, name);
        method.isInterfaceMethod(true);
        return method;
    };
    InterfaceGen.prototype.getPropertiesCode = function () {
        var codes = [];
        for (var i = 0, il = this.properties.length; i < il; ++i) {
            var code = this.properties[i].name;
            if (this.properties[i].isOptional)
                code += '?';
            if (this.properties[i].type)
                code += ": " + this.properties[i].type;
            code += ';';
            codes.push(code);
        }
        return codes.join('\n    ');
    };
    InterfaceGen.prototype.generate = function () {
        var code = this.shouldBeExported ? 'export ' : '';
        code += "interface " + this.name;
        if (this.parentClass)
            code += ' extends ' + this.parentClass;
        if (this.implementations.length) {
            code += ' implements ' + this.implementations.join(', ');
        }
        code += ' {\n';
        if (this.properties.length)
            code += "    " + this.getPropertiesCode() + "\n";
        for (var i = 0, il = this.methods.length; i < il; ++i) {
            code += this.methods[i].generate();
            code += '\n';
        }
        code += '}';
        return code;
    };
    return InterfaceGen;
}(AbstractStructureGen_1.AbstractStructureGen));
exports.InterfaceGen = InterfaceGen;
