import * as _ from "lodash";
import {BaseFormGen} from "./BaseFormGen";
import {XMLGen} from "../../../../core/XMLGen";
import {INGFormWrapperConfig} from "../NGFormGen";
import {Field} from "vesta-util";

export class MaterialFormGen extends BaseFormGen {

    private static getInputContainer(title?:string):XMLGen {
        var wrapper = new XMLGen('md-input-container');
        wrapper.addClass('md-block');
        if (title) {
            var label = new XMLGen('label');
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
        var wrapper = MaterialFormGen.getInputContainer(field.fieldName);
        this.getElementsByFieldType(wrapper, field.fieldName, field.properties);
        return wrapper;
    }

    public wrap(config:INGFormWrapperConfig):XMLGen {
        var modelInstanceName = _.camelCase(this.schema.name),
            modelClassName = _.capitalize(modelInstanceName),
            wrapper = new XMLGen(config.isModal ? 'md-dialog' : 'div'),
            form = new XMLGen('form');
        wrapper.setAttribute('aria-label', config.title);
        form.setAttribute('name', `vm.${modelInstanceName}Form`)
            .setAttribute('ng-submit', `vm.${config.type}${modelClassName}()`)
            .setAttribute('novalidate')
            .appendTo(wrapper);

        if (config.isModal) {
            var toolbar = new XMLGen('md-toolbar'),
                actionBar = new XMLGen('div'),
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
                .addClass('md-actions')
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
