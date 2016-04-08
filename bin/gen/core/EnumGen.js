"use strict";
var _ = require('lodash');
var EnumGen = (function () {
    function EnumGen(name) {
        this.startIndex = 1;
        this.shouldBeExported = true;
        this.properties = [];
        this.name = _.capitalize(_.camelCase(name));
    }
    EnumGen.prototype.shouldExport = function (shouldBeExported) {
        if (shouldBeExported === void 0) { shouldBeExported = true; }
        this.shouldBeExported = shouldBeExported;
    };
    EnumGen.prototype.addProperty = function (name, index) {
        name = _.capitalize(_.camelCase(name));
        if (!index || index < 0)
            index = 0;
        for (var i = this.properties.length; i--;) {
            if (this.properties[i].name == name) {
                if (index) {
                    this.properties[i].index = index;
                }
                return;
            }
        }
        this.properties.push({ name: name, index: index });
        this.properties = this.properties.sort(function (a, b) {
            return a.index - b.index;
        });
    };
    EnumGen.prototype.setStartIndex = function (index) {
        for (var i = this.properties.length; i--;) {
            if (this.properties[i].index == index) {
                return;
            }
        }
        if (index >= 0) {
            this.startIndex = index;
        }
    };
    EnumGen.prototype.generate = function () {
        var code = this.shouldBeExported ? 'export ' : '', props = [];
        code += "enum " + this.name + " {";
        for (var i = 0, il = this.properties.length; i < il; ++i) {
            if (this.properties[i].index) {
                props.push(this.properties[i].name + " = " + this.properties[i].index);
            }
            else if (i == 0 && this.startIndex > 0) {
                props.push(this.properties[i].name + " = " + this.startIndex);
            }
            else {
                props.push(this.properties[i].name);
            }
        }
        code = "" + code + props.join(', ') + "}";
        return code;
    };
    return EnumGen;
}());
exports.EnumGen = EnumGen;
