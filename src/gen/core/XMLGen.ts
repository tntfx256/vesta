export class XMLGen {
    private classNames: string[] = [];
    private noValueAttributes: string[] = [];
    private attributes: any = {};
    private children: XMLGen[] = [];
    private textContent: string = "";
    private htmlContent: string = "";

    constructor(public tagName: string, public isSingleTag: boolean = false) {
    }

    public addClass(className: string): XMLGen {
        const classes = className.split("\W");
        classes.forEach((c) => {
            if (this.classNames.indexOf(c) < 0) {
                this.classNames.push(c);
            }
        });
        return this;
    }

    public removeClass(className: string): XMLGen {
        let index = -1;
        const classes = className.split("\W");
        classes.forEach((c) => {
            index = this.classNames.indexOf(c);
            if (index >= 0) {
                this.classNames.splice(index, 1);
            }
        });
        return this;
    }

    public setAttribute(name: string, value?: any): XMLGen {
        if ("undefined" === typeof value) {
            if (this.noValueAttributes.indexOf(name) < 0) {
                this.noValueAttributes.push(name);
            }
        } else {
            this.attributes[name] = value;
        }
        return this;
    }

    public getAttribute(name: string): string {
        return this.attributes[name];
    }

    public removeAttribute(name): XMLGen {
        const index = this.noValueAttributes.indexOf(name);
        if (index >= 0) {
            this.noValueAttributes.splice(index, 1);
        } else {
            delete this.attributes[name];
        }
        return this;
    }

    public append(...children: XMLGen[]): XMLGen {
        this.children = this.children.concat(children);
        return this;
    }

    public prepend(...children: XMLGen[]): XMLGen {
        this.children = children.concat(this.children);
        return this;
    }

    public appendTo(parent: XMLGen): XMLGen {
        parent.append(this);
        return this;
    }

    public insertAfter(siblingTagName: string, newElement: XMLGen): XMLGen {
        let lastIndex = -1;
        for (let i = this.children.length; i--;) {
            if (this.children[i].tagName === siblingTagName) {
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

    public insertBefore(siblingTagName: string, newElement: XMLGen) {
        let firstIndex = -1;
        for (let i = this.children.length; i--;) {
            if (this.children[i].tagName === siblingTagName) {
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

    public prependTo(parent: XMLGen): XMLGen {
        parent.prepend(this);
        return this;
    }

    public html(html: string): XMLGen {
        this.htmlContent = html;
        return this;
    }

    public text(text: string): XMLGen {
        this.textContent = text;
        return this;
    }

    public getChildren(): XMLGen[] {
        return [].concat(this.children);
    }

    public getChildById(id: string): XMLGen {
        for (let i = this.children.length; i--;) {
            if (this.children[i].getAttribute("id") === id) {
                return this.children[i];
            }
        }
        return null;
    }

    public getChildrenByTagName(tagName: string): XMLGen[] {
        const result: XMLGen[] = [];
        for (let i = this.children.length; i--;) {
            if (this.children[i].tagName === tagName) {
                result.push(this.children[i]);
            }
        }
        return result;
    }

    public getChildrenByAttribute(attribute: string, value?: string): XMLGen[] {
        const result: XMLGen[] = [];
        for (let i = this.children.length; i--;) {
            if (this.children[i].attributes[attribute]) {
                if (value === undefined || this.children[i].attributes[attribute] === value) {
                    result.push(this.children[i]);
                }
            }
        }
        return result;
    }

    public generate(indent: string = ""): string {
        let code = `${indent}<${this.tagName}`;
        if (this.classNames.length) {
            code += ` class="${this.classNames.join(" ")}"`;
        }
        for (const attr in this.attributes) {
            if (this.attributes.hasOwnProperty(attr)) {
                code += ` ${attr}="${this.attributes[attr]}"`;
            }
        }
        if (this.noValueAttributes.length) {
            code += " " + this.noValueAttributes.join(" ");
        }
        if (this.isSingleTag) {
            code += "/>";
        } else {
            code += ">";
            if (this.textContent) {
                code += `${this.textContent}</${this.tagName}>`;
            } else if (this.htmlContent) {
                code += `\n${indent}    ${this.htmlContent}\n${indent}</${this.tagName}>`;
            } else if (this.children.length) {
                code += "\n";
                this.children.forEach((child) => {
                    code += child.generate(`${indent}    `);
                    code += "\n";
                });
                code += `${indent}</${this.tagName}>`;
            } else {
                code += `</${this.tagName}>`;
            }
        }
        return code;
    }
}
