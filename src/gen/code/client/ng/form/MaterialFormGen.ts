import * as _ from "lodash";
import {BaseFormGen} from "./BaseFormGen";
import {XMLGen} from "../../../../core/XMLGen";
import {INGFormWrapperConfig} from "../NGFormGen";
import {Field, FieldType} from "vesta-schema/Field";
import {ModelGen} from "../../../ModelGen";

export class MaterialFormGen extends BaseFormGen {

    private static getInputContainer(title?:string, noFloat?:boolean):XMLGen {
        var wrapper = new XMLGen('md-input-container');
        wrapper.addClass('md-block');
        if (title) {
            var label = new XMLGen('label');
            if (noFloat) {
                label.addClass('md-no-float');
            }
            label.text(title).setAttribute('for', title);
            wrapper.append(label);
        }
        return wrapper;
    }

    protected genSelectField(wrapper:XMLGen, options:Array<any>):XMLGen {
        var select = new XMLGen('md-select');
        options.forEach(item=> {
            select.append(new XMLGen('md-option').setAttribute('ng-value', item).text(item));
        });
        return select;
    }

    protected genElementForField(field:Field):XMLGen {
        var isCheckbox = field.properties.type == FieldType.Boolean;
        var wrapper = MaterialFormGen.getInputContainer(field.fieldName, isCheckbox);
        this.getElementsByFieldType(wrapper, field.fieldName, field.properties);
        return wrapper;
    }

    protected genCheckboxField():XMLGen {
        return new XMLGen('md-checkbox', true);
    }

    public wrap(config:INGFormWrapperConfig):XMLGen {
        var modelInstanceName = _.camelCase(ModelGen.extractModelName(this.schema.name)),
            modelClassName = _.capitalize(modelInstanceName),
            wrapper = new XMLGen(config.isModal ? 'md-dialog' : 'div'),
            form = new XMLGen('form');
        wrapper.setAttribute('aria-label', config.title).addClass('form-wrapper');
        form.setAttribute('name', `vm.${modelInstanceName}Form`)
            .setAttribute('ng-submit', `vm.${config.type}${modelClassName}()`)
            .setAttribute('novalidate')
            .appendTo(wrapper);

        if (config.isModal) {
            var toolbar = new XMLGen('md-toolbar'),
                actionBar = new XMLGen('md-dialog-actions'),
                contentWrapper = new XMLGen('md-dialog-content');
            toolbar.html(`
            <div class="md-toolbar-tools">
                <h3 class="box-title">${config.title}</h3>

                <div flex></div>
                <md-button type="button" class="md-icon-button" ng-click="vm.closeFormModal()">
                    <md-icon>clear</md-icon>
                </md-button>
            </div>`);
            contentWrapper.html(`
            <div ng-include="'${config.formPath}'"></div>`);
            actionBar
                .setAttribute('layout', 'row')
                .html(`
            <md-button type="submit" class="md-primary md-raised">${config.ok}</md-button>
            <md-button type="button" class="md-primary" ng-click="vm.closeFormModal()">${config.cancel}</md-button>`);
            form.append(toolbar, contentWrapper, actionBar);
        } else {
            var contentWrapper = new XMLGen('div');
            contentWrapper.setAttribute('ng-include', `'${config.formPath}'`)
                .appendTo(form);
            // btns
        }
        return wrapper;
    }

}
