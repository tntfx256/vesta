"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ExtArray = (function (_super) {
    __extends(ExtArray, _super);
    function ExtArray() {
        _super.apply(this, arguments);
    }
    ExtArray.prototype.indexOfByProperty = function (property, value, fromIndex) {
        if (fromIndex === void 0) { fromIndex = 0; }
        for (var i = fromIndex, il = this.length; i < il; ++i) {
            if (this[i][property] == value) {
                return i;
            }
        }
        return -1;
    };
    ExtArray.prototype.findByProperty = function (property, value) {
        var founds = new ExtArray(), i, il;
        if (value.splice) {
            for (i = 0, il = this.length; i < il; ++i) {
                for (var j = 0, jl = value.length; j < jl; ++j) {
                    if (this[i][property] == value[j]) {
                        founds.push(this[i]);
                    }
                }
            }
        }
        else {
            for (i = 0, il = this.length; i < il; ++i) {
                if (this[i][property] == value) {
                    founds.push(this[i]);
                }
            }
        }
        return founds;
    };
    ExtArray.prototype.removeByProperty = function (property, value) {
        var index = this.indexOfByProperty(property, value);
        return index >= 0 ? this.splice(index, 1) : undefined;
    };
    ExtArray.prototype.set = function (items) {
        this.splice(0, this.length);
        for (var i = 0, il = items.length; i < il; ++i) {
            this.push(items[i]);
        }
    };
    ExtArray.prototype.clear = function () {
        this.splice(0, this.length);
    };
    return ExtArray;
}(Array));
exports.ExtArray = ExtArray;
