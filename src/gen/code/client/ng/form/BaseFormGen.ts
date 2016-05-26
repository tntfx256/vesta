import * as _ from "lodash";
import {XMLGen} from "../../../../core/XMLGen";
import {INGFormWrapperConfig} from "../NGFormGen";
import {Schema} from "vesta-schema/Schema";
import {IModelFields, Model} from "vesta-schema/Model";
import {IFieldProperties, FieldType, Field} from "vesta-schema/Field";

export abstract class BaseFormGen {
    protected schema:Schema;
    protected fields:IModelFields;

    constructor(protected model:Model) {
        if (model) {
            this.schema = model['schema'];
            this.fields = this.schema.getFields();
        }
    }

    protected genTextInputField():XMLGen {
        var input = new XMLGen('input', true);
        input.setAttribute('type', 'text');
        return input;
    }

    protected genTextField():XMLGen {
        var input = new XMLGen('textarea');
        return input;
    }

    protected genTypedInputField(type):XMLGen {
        var input = new XMLGen('input', true);
        input.setAttribute('type', type).setAttribute('dir', 'ltr');
        return input;
    }

    protected genNumberInputField(isFloat:boolean = false):XMLGen {
        var input = new XMLGen('input', true);
        input.setAttribute('type', 'number').setAttribute('dir', 'ltr');
        input.setAttribute('step', isFloat ? 1 : 0.1);
        return input;
    }

    protected genFileField(fileType:Array<string>):XMLGen {
        var input = new XMLGen('input', true);
        input.setAttribute('type', 'file').setAttribute('file-upload');
        if (fileType.length) {
            input.setAttribute('accept', fileType.join(','));
        }
        return input;
    }

    protected genDateTimeField():XMLGen {
        var input = new XMLGen('input', true);
        input.setAttribute('dir', 'ltr').setAttribute('date-input');
        return input;
    }

    protected genCheckboxField():XMLGen {
        var input = new XMLGen('input', true);
        input.setAttribute('type', 'checkbox');
        return input;
    }

    protected genSelectField(wrapper:XMLGen, options:Array<any>):XMLGen {
        var select = new XMLGen('select');
        options.forEach(item=> {
            select.append(new XMLGen('option').setAttribute('value', item).text(item));
        });
        return select;
    }

    protected getElementsByFieldType(wrapper:XMLGen, name:string, properties:IFieldProperties):void {
        var modelInstanceName = _.camelCase(this.schema.name),
            formName = `${modelInstanceName}Form`,
            input = new XMLGen('input', true),
            ngMessages:Array<XMLGen> = [];
        switch (properties.type) {
            case FieldType.String:
                input = this.genTextInputField();
                break;
            case FieldType.Text:
                input = this.genTextField();
                break;
            case FieldType.Password:
                input = this.genTypedInputField('password');
                break;
            case FieldType.Tel:
            case FieldType.EMail:
            case FieldType.URL:
                this.genTypedInputField(properties.type);
                ngMessages.push(new XMLGen('div').setAttribute('ng-message', properties.type).text(`Invalid ${properties.type}`));
                break;
            case FieldType.Float:
            case FieldType.Number:
            case FieldType.Integer:
                input = this.genNumberInputField(properties.type == FieldType.Float);
                break;
            case FieldType.File:
                input = this.genFileField(properties.fileType);
                break;
            case FieldType.Timestamp:
                input = this.genDateTimeField();
                ngMessages.push(new XMLGen('div').setAttribute('ng-message', 'date').text(`Invalid date`));
                break;
            case FieldType.Boolean:
                input = this.genCheckboxField();
                break;
            case FieldType.Enum:
                input = this.genSelectField(wrapper, properties.enum);
                ngMessages.push(new XMLGen('div').setAttribute('ng-message', 'enum').text(`Value must be one of the list items`));
                break;
            //case FieldType.Object:
            //    break;
        }
        input.setAttribute('name', name);
        input.setAttribute('ng-model', `vm.${modelInstanceName}.${name}`).setAttribute('id', name);
        wrapper.append(input);
        if (properties.required) {
            input.setAttribute('required');
            ngMessages.push(new XMLGen('div').setAttribute('ng-message', 'required').text('This field is required'));
        }
        if (properties.unique) {
            ngMessages.push(new XMLGen('div').setAttribute('ng-message', 'unique').text('Duplicate Entry'));
        }
        if (properties.min) {
            input.setAttribute('min', properties.min);
            ngMessages.push(new XMLGen('div').setAttribute('ng-message', 'min').text(`Value must be greater than ${properties.min}`));
        }
        if (properties.max) {
            input.setAttribute('max', properties.max);
            ngMessages.push(new XMLGen('div').setAttribute('ng-message', 'max').text(`Value must be less than ${properties.max}`));
        }
        if (properties.minLength) {
            input.setAttribute('minlength', properties.minLength);
            ngMessages.push(new XMLGen('div').setAttribute('ng-message', 'minLength').text(`Characters must be longer than ${properties.minLength}`));
        }
        if (properties.maxLength) {
            input.setAttribute('maxlength', properties.maxLength);
            ngMessages.push(new XMLGen('div').setAttribute('ng-message', 'maxLength').text(`Characters must be longer than ${properties.maxLength}`));
        }
        if (properties.fileType && properties.fileType.length) {
            input.setAttribute('accept', properties.fileType.join(','));
            ngMessages.push(new XMLGen('div').setAttribute('ng-message', 'fileType').text(`File type is not supported`));
        }
        if (properties.maxSize) {
            ngMessages.push(new XMLGen('div').setAttribute('ng-message', 'maxSize').text(`File size should be less than ${properties.maxSize} KB`));
        }
        if (ngMessages.length) {
            var ngMessageWrapper = new XMLGen('div');
            ngMessageWrapper.setAttribute('ng-messages', `vm.${formName}.${name}.$dirty && vm.${formName}.${name}.$error`);
            ngMessageWrapper.append(...ngMessages);
            wrapper.append(ngMessageWrapper);
        }
    }

    public generate():string {
        var fields = Object.keys(this.fields),
            codes:Array<string> = [];
        fields.forEach(fieldName=> {
            var elm = this.genElementForField(this.fields[fieldName]);
            //this.elements.push(elm);
            codes.push(elm.generate());
        });
        return codes.join('\n');
    }

    protected abstract genElementForField(field:Field):XMLGen;

    public abstract wrap(config:INGFormWrapperConfig):XMLGen;
}
