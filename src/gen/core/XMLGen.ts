export class XMLGen {
    private classNames: Array<string> = [];
    private noValueAttributes: Array<string> = [];
    private attributes: any = {};
    private children: Array<XMLGen> = [];
    private textContent: string = '';
    private htmlContent: string = '';

    constructor(public tagName: string, public isSingleTag: boolean = false) {
    }

    addClass(className: string): XMLGen {
        var classes = className.split('\W');
        classes.forEach(className=> {
            if (this.classNames.indexOf(className) < 0) {
                this.classNames.push(className);
            }
        });
        return this;
    }

    removeClass(className: string): XMLGen {
        var index = -1,
            classes = className.split('\W');
        classes.forEach(className=> {
            if ((index = this.classNames.indexOf(className)) >= 0) {
                this.classNames.splice(index, 1);
            }
        });
        return this;
    }

    setAttribute(name: string, value?: any): XMLGen {
        if ('undefined' == typeof value) {
            if (this.noValueAttributes.indexOf(name) < 0) {
                this.noValueAttributes.push(name);
            }
        } else {
            this.attributes[name] = value;
        }
        return this;
    }

    getAttribute(name: string): string {
        return this.attributes[name];
    }

    removeAttribute(name): XMLGen {
        var index = this.noValueAttributes.indexOf(name);
        if (index >= 0) {
            this.noValueAttributes.splice(index, 1);
        } else {
            delete this.attributes[name];
        }
        return this;
    }

    append(...children: Array<XMLGen>): XMLGen {
        this.children = this.children.concat(children);
        return this;
    }

    prepend(...children: Array<XMLGen>): XMLGen {
        this.children = children.concat(this.children);
        return this;
    }

    appendTo(parent: XMLGen): XMLGen {
        parent.append(this);
        return this;
    }

    insertAfter(siblingTagName: string, newElement: XMLGen): XMLGen {
        var lastIndex = -1;
        for (var i = this.children.length; i--;) {
            if (this.children[i].tagName == siblingTagName) {
                lastIndex = i;
            }
        }
        if (lastIndex >= 0) {
            this.children.splice(lastIndex, 0, newElement);
        } else {
            this.append(newElement);
        }
        return this;
    }

    insertBefore(siblingTagName: string, newElement: XMLGen) {
        var firstIndex = -1;
        for (var i = this.children.length; i--;) {
            if (this.children[i].tagName == siblingTagName) {
                firstIndex = i;
                break;
            }
        }
        if (firstIndex >= 0) {
            this.children.splice(firstIndex, 0, newElement);
        } else {
            this.prepend(newElement);
        }
        return this;
    }

    prependTo(parent: XMLGen): XMLGen {
        parent.prepend(this);
        return this;
    }

    html(html: string): XMLGen {
        this.htmlContent = html;
        return this;
    }

    text(text: string): XMLGen {
        this.textContent = text;
        return this;
    }

    getChildren(): Array<XMLGen> {
        return [].concat(this.children);
    }

    getChildById(id: string): XMLGen {
        for (var i = this.children.length; i--;) {
            if (this.children[i].getAttribute('id') == id) {
                return this.children[i];
            }
        }
        return null;
    }

    getChildrenByTagName(tagName: string): Array<XMLGen> {
        var result: Array<XMLGen> = [];
        for (var i = this.children.length; i--;) {
            if (this.children[i].tagName == tagName) {
                result.push(this.children[i]);
            }
        }
        return result;
    }

    getChildrenByAttribute(attribute: string, value?: string): Array<XMLGen> {
        var result: Array<XMLGen> = [];
        for (var i = this.children.length; i--;) {
            if (this.children[i].attributes[attribute]) {
                if (value === undefined || this.children[i].attributes[attribute] == value) {
                    result.push(this.children[i]);
                }
            }
        }
        return result;
    }

    generate(indent: string = ''): string {
        var code = `${indent}<${this.tagName}`;
        if (this.classNames.length) {
            code += ` class="${this.classNames.join(' ')}"`;
        }
        for (var attr in this.attributes) {
            if (this.attributes.hasOwnProperty(attr)) {
                code += ` ${attr}="${this.attributes[attr]}"`;
            }
        }
        if (this.noValueAttributes.length) {
            code += ' ' + this.noValueAttributes.join(' ');
        }
        if (this.isSingleTag) {
            code += '/>';
        } else {
            code += '>';
            if (this.textContent) {
                code += `${this.textContent}</${this.tagName}>`;
            } else if (this.htmlContent) {
                code += `\n${indent}    ${this.htmlContent}\n${indent}</${this.tagName}>`;
            } else if (this.children.length) {
                code += '\n';
                this.children.forEach(child=> {
                    code += child.generate(`${indent}    `);
                    code += '\n';
                });
                code += `${indent}</${this.tagName}>`;
            } else {
                code += `</${this.tagName}>`;
            }
        }
        return code;
    }
}
