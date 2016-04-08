"use strict";
var _ = require('lodash');
var MethodGen_1 = require("./MethodGen");
var AbstractStructureGen = (function () {
    function AbstractStructureGen(name) {
        this.shouldBeExported = true;
        this.methods = [];
        this.properties = [];
        this.implementations = [];
        this.name = _.capitalize(_.camelCase(name));
    }
    AbstractStructureGen.prototype.setConstructor = function () {
        this.constructorMethod = new MethodGen_1.MethodGen();
        return this.constructorMethod;
    };
    AbstractStructureGen.prototype.getConstructor = function () {
        return this.constructorMethod;
    };
    AbstractStructureGen.prototype.addMethod = function (name) {
        for (var i = this.methods.length; i--;) {
            if (this.methods[i].name == name) {
                return this.methods[i];
            }
        }
        var method = new MethodGen_1.MethodGen(name);
        this.methods.push(method);
        return method;
    };
    AbstractStructureGen.prototype.getMethod = function (name) {
        name = _.camelCase(name);
        for (var i = this.methods.length; i--;) {
            if (this.methods[i].name == name) {
                return this.methods[i];
            }
        }
        return null;
    };
    AbstractStructureGen.prototype.shouldExport = function (shouldBeExported) {
        if (shouldBeExported === void 0) { shouldBeExported = true; }
        this.shouldBeExported = shouldBeExported;
    };
    AbstractStructureGen.prototype.setParentClass = function (className) {
        this.parentClass = className;
    };
    AbstractStructureGen.prototype.addImplements = function () {
        var _this = this;
        var interfaces = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            interfaces[_i - 0] = arguments[_i];
        }
        interfaces.forEach(function (intfc) {
            if (_this.implementations.indexOf(intfc) < 0) {
                _this.implementations.push(intfc);
            }
        });
    };
    AbstractStructureGen.prototype.addProperty = function (property) {
        for (var i = this.properties.length; i--;) {
            if (this.properties[i].name == property.name) {
                return;
            }
        }
        this.properties.push(property);
    };
    return AbstractStructureGen;
}());
exports.AbstractStructureGen = AbstractStructureGen;
