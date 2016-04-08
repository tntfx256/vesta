"use strict";
var XMLGen = (function () {
    function XMLGen(tagName, isSingleTag) {
        if (isSingleTag === void 0) { isSingleTag = false; }
        this.tagName = tagName;
        this.isSingleTag = isSingleTag;
        this.classNames = [];
        this.noValueAttributes = [];
        this.attributes = {};
        this.children = [];
        this.textContent = '';
        this.htmlContent = '';
    }
    XMLGen.prototype.addClass = function (className) {
        var _this = this;
        var classes = className.split('\W');
        classes.forEach(function (className) {
            if (_this.classNames.indexOf(className) < 0) {
                _this.classNames.push(className);
            }
        });
        return this;
    };
    XMLGen.prototype.removeClass = function (className) {
        var _this = this;
        var index = -1, classes = className.split('\W');
        classes.forEach(function (className) {
            if ((index = _this.classNames.indexOf(className)) >= 0) {
                _this.classNames.splice(index, 1);
            }
        });
        return this;
    };
    XMLGen.prototype.setAttribute = function (name, value) {
        if ('undefined' == typeof value) {
            if (this.noValueAttributes.indexOf(name) < 0) {
                this.noValueAttributes.push(name);
            }
        }
        else {
            this.attributes[name] = value;
        }
        return this;
    };
    XMLGen.prototype.getAttribute = function (name) {
        return this.attributes[name];
    };
    XMLGen.prototype.removeAttribute = function (name) {
        var index = this.noValueAttributes.indexOf(name);
        if (index >= 0) {
            this.noValueAttributes.splice(index, 1);
        }
        else {
            delete this.attributes[name];
        }
        return this;
    };
    XMLGen.prototype.append = function () {
        var children = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            children[_i - 0] = arguments[_i];
        }
        this.children = this.children.concat(children);
        return this;
    };
    XMLGen.prototype.prepend = function () {
        var children = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            children[_i - 0] = arguments[_i];
        }
        this.children = children.concat(this.children);
        return this;
    };
    XMLGen.prototype.appendTo = function (parent) {
        parent.append(this);
        return this;
    };
    XMLGen.prototype.insertAfter = function (siblingTagName, newElement) {
        var lastIndex = -1;
        for (var i = this.children.length; i--;) {
            if (this.children[i].tagName == siblingTagName) {
                lastIndex = i;
            }
        }
        if (lastIndex >= 0) {
            this.children.splice(lastIndex, 0, newElement);
        }
        else {
            this.append(newElement);
        }
        return this;
    };
    XMLGen.prototype.insertBefore = function (siblingTagName, newElement) {
        var firstIndex = -1;
        for (var i = this.children.length; i--;) {
            if (this.children[i].tagName == siblingTagName) {
                firstIndex = i;
                break;
            }
        }
        if (firstIndex >= 0) {
            this.children.splice(firstIndex, 0, newElement);
        }
        else {
            this.prepend(newElement);
        }
        return this;
    };
    XMLGen.prototype.prependTo = function (parent) {
        parent.prepend(this);
        return this;
    };
    XMLGen.prototype.html = function (html) {
        this.htmlContent = html;
        return this;
    };
    XMLGen.prototype.text = function (text) {
        this.textContent = text;
        return this;
    };
    XMLGen.prototype.getChildById = function (id) {
        for (var i = this.children.length; i--;) {
            if (this.children[i].getAttribute('id') == id) {
                return this.children[i];
            }
        }
        return null;
    };
    XMLGen.prototype.getChildrenByTagName = function (tagName) {
        var result = [];
        for (var i = this.children.length; i--;) {
            if (this.children[i].tagName == tagName) {
                result.push(this.children[i]);
            }
        }
        return result;
    };
    XMLGen.prototype.getChildrenByAttribute = function (attribute, value) {
        var result = [];
        for (var i = this.children.length; i--;) {
            if (this.children[i].attributes[attribute]) {
                if (value === undefined || this.children[i].attributes[attribute] == value) {
                    result.push(this.children[i]);
                }
            }
        }
        return result;
    };
    XMLGen.prototype.generate = function (indent) {
        if (indent === void 0) { indent = ''; }
        var code = indent + "<" + this.tagName;
        if (this.classNames.length) {
            code += " class=\"" + this.classNames.join(' ') + "\"";
        }
        for (var attr in this.attributes) {
            if (this.attributes.hasOwnProperty(attr)) {
                code += " " + attr + "=\"" + this.attributes[attr] + "\"";
            }
        }
        if (this.noValueAttributes.length) {
            code += ' ' + this.noValueAttributes.join(' ');
        }
        if (this.isSingleTag) {
            code += '/>';
        }
        else {
            code += '>';
            if (this.textContent) {
                code += this.textContent + "</" + this.tagName + ">";
            }
            else if (this.htmlContent) {
                code += "\n" + indent + "    " + this.htmlContent + "\n" + indent + "</" + this.tagName + ">";
            }
            else if (this.children.length) {
                code += '\n';
                this.children.forEach(function (child) {
                    code += child.generate(indent + "    ");
                    code += '\n';
                });
                code += indent + "</" + this.tagName + ">";
            }
            else {
                code += "</" + this.tagName + ">";
            }
        }
        return code;
    };
    return XMLGen;
}());
exports.XMLGen = XMLGen;
