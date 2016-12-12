import * as _ from "lodash";
import {BaseNgFormGen} from "./BaseNgFormGen";
import {XMLGen} from "../../../../core/XMLGen";
import {INGFormWrapperConfig} from "../NGFormGen";
import {Field, FieldType, RelationType, IFieldProperties} from "vesta-schema/Field";
import {ModelGen} from "../../../ModelGen";
import {Util} from "../../../../../util/Util";
import {StringUtil} from "../../../../../util/StringUtil";

export class MaterialFormGen extends BaseNgFormGen {

    private static AutoCompleteDelay = 300;

    private static getInputContainer(title?: string, noFloat?: boolean): XMLGen {
        let wrapper = new XMLGen('md-input-container');
        wrapper.addClass('md-block');
        if (title) {
            let label = new XMLGen('label');
            if (noFloat) {
                label.addClass('md-no-float');
            }
            label.text(`{{'${title}' | tr}}`).setAttribute('for', title);
            wrapper.append(label);
        }
        return wrapper;
    }

    /**
     * Normal select control
     */
    protected genSelectField(wrapper: XMLGen, fieldName: string, properties: IFieldProperties): XMLGen {
        let select = new XMLGen('md-select');
        properties.enum.forEach(item=> {
            select.append(new XMLGen('md-option').setAttribute('ng-value', item).text(item));
        });
        return select;
    }

    /**
     * Select for relations of types RelationType.One2Many & RelationType.One2One
     */
    protected genAutoCompleteField(field: Field): XMLGen {
        let modelInstanceName = _.camelCase(ModelGen.extractModelName(this.schema.name)),
            targetFieldName = ModelGen.getUniqueFieldNameOfRelatedModel(field);
        let wrapper = new XMLGen('md-autocomplete');
        wrapper.setAttribute('md-input-name', field.fieldName)
            .setAttribute('md-input-id', `${field.fieldName}`)
            .setAttribute('md-delay', MaterialFormGen.AutoCompleteDelay)
            .setAttribute('md-no-cache', 'true')
            .setAttribute('md-floating-label', field.fieldName)
            .setAttribute('md-search-text', `vm.${field.fieldName}SearchText`)
            .setAttribute('md-min-length', '2')
            .setAttribute('md-selected-item', `vm.${modelInstanceName}.${field.fieldName}`)
            .setAttribute('md-item-text', `item.${targetFieldName}`)
            // .setAttribute('ng-disabled', `!vm.${field.fieldName}.length`)
            .setAttribute('md-items', `item in vm.search${StringUtil.fcUpper(field.fieldName)}(vm.${field.fieldName}SearchText)`);
        //
        let content = new XMLGen('md-item-template');
        content.html(`<span>{{item.${targetFieldName}}}</span>`);
        wrapper.append(content);
        // ng messages
        let ngMessages = this.getNgMessage(field.fieldName, field.properties);
        if (ngMessages.getChildren().length) wrapper.append(ngMessages);
        return wrapper;
    }

    /**
     * Multi-select for relations of type RelationType.Many2Many
     * <div.md-input-wrapper>
     *     <md-chips>...</md-chips>
     *     <div ng-messages></div>
     * </div>
     */
    protected genMultiSelectField(field: Field, forceMatch?: boolean): XMLGen {
        let modelInstanceName = _.camelCase(ModelGen.extractModelName(this.schema.name));
        let outerWrapper = new XMLGen('div');
        outerWrapper.addClass('md-input-wrapper');
        let wrapper = new XMLGen('md-chips');
        let targetFieldName = ModelGen.getUniqueFieldNameOfRelatedModel(field);
        wrapper.setAttribute('ng-model', `vm.${modelInstanceName}.${field.fieldName}`)
            .setAttribute('md-require-match', forceMatch ? 'true' : 'false');
        wrapper.appendTo(outerWrapper);
        // auto complete
        let autoComplete = new XMLGen('md-autocomplete');
        autoComplete.setAttribute('md-input-name', field.fieldName)
            .setAttribute('md-input-id', field.fieldName)
            .setAttribute('md-search-text', `vm.${field.fieldName}SearchText`)
            .setAttribute('md-items', `item in vm.search${StringUtil.fcUpper(field.fieldName)}(vm.${field.fieldName}SearchText)`)
            .setAttribute('md-item-text', `item.${targetFieldName}`)
            .setAttribute('md-delay', MaterialFormGen.AutoCompleteDelay)
            .setAttribute('placeholder', field.fieldName);
        autoComplete.html(`<span>{{item.${targetFieldName}}}</span>`);
        wrapper.append(autoComplete);
        // chip
        let chipWrapper = new XMLGen('md-chip-template');
        chipWrapper.html(`<span>{{$chip.${targetFieldName}}}</span>`);
        wrapper.append(chipWrapper);
        // ng-messages
        let ngMessages = this.getNgMessage(field.fieldName, field.properties);
        if (ngMessages.getChildren().length) outerWrapper.append(ngMessages);
        return outerWrapper;
    }

    /**
     * Multi-select auto-complete component for type of FieldType.List
     */
    protected genListField(field: Field): XMLGen {
        let itemProperties = Util.clone<IFieldProperties>(field.properties);
        itemProperties.type = field.properties.list;
        if (itemProperties.type == FieldType.File) {
            let wrapper = MaterialFormGen.getInputContainer(field.fieldName);
            this.getElementsByFieldType(wrapper, field.fieldName, itemProperties);
            // ng-messages is set from this.getElementsByFieldType method
            return wrapper;
        }
        let modelInstanceName = _.camelCase(ModelGen.extractModelName(this.schema.name));
        let outerWrapper = new XMLGen('div');
        outerWrapper.addClass('md-input-wrapper');
        let wrapper = new XMLGen('md-chips');
        let targetFieldName = field.fieldName;
        wrapper.setAttribute('ng-model', `vm.${modelInstanceName}.${field.fieldName}`);
        // chip
        let chipWrapper = new XMLGen('md-chip-template');
        chipWrapper.html(`<span>{{$chip.${targetFieldName}}}</span>`);
        wrapper.append(chipWrapper);
        outerWrapper.append(wrapper);
        // ng-messages
        let ngMessages = this.getNgMessage(field.fieldName, field.properties);
        if (ngMessages.getChildren().length) outerWrapper.append(ngMessages);
        return outerWrapper;
    }

    /**
     * @inheritDoc
     */
    protected genElementForField(field: Field): XMLGen {
        switch (field.properties.type) {
            case FieldType.Relation:
                return field.properties.relation.type == RelationType.Many2Many ?
                    this.genMultiSelectField(field, true) :
                    this.genAutoCompleteField(field);
            case FieldType.List:
                return this.genListField(field);
            default:
                let isCheckbox = field.properties.type == FieldType.Boolean;
                let wrapper = MaterialFormGen.getInputContainer(field.fieldName, isCheckbox);
                let result = this.getElementsByFieldType(wrapper, field.fieldName, field.properties);
                return result ? wrapper : null;
        }
    }

    protected genCheckboxField(): XMLGen {
        return new XMLGen('md-checkbox', true);
    }

    public wrap(config: INGFormWrapperConfig): XMLGen {
        let modelInstanceName = _.camelCase(ModelGen.extractModelName(this.schema.name)),
            modelClassName = StringUtil.fcUpper(modelInstanceName),
            wrapper = new XMLGen(config.isModal ? 'md-dialog' : 'div'),
            form = new XMLGen('form');
        wrapper.setAttribute('aria-label', config.title).addClass('form-wrapper');
        form.setAttribute('name', `vm.${modelInstanceName}Form`)
            .setAttribute('ng-submit', `vm.${config.type}${modelClassName}()`)
            .setAttribute('novalidate')
            .appendTo(wrapper);
        if (config.isModal) {
            let toolbar = new XMLGen('md-toolbar'),
                actionBar = new XMLGen('md-dialog-actions'),
                contentWrapper = new XMLGen('md-dialog-content');
            toolbar.html(`<div class="md-toolbar-tools">
                <h3 class="box-title">${config.title}</h3>
                <div flex></div>
                <md-button type="button" class="md-icon-button" ng-click="vm.closeFormModal()">
                    <md-icon>clear</md-icon>
                </md-button>
            </div>`);
            contentWrapper.html(`<div ng-include="'${config.formPath}'"></div>`);
            actionBar
                .setAttribute('layout', 'row')
                .html(`<md-button type="submit" class="md-primary md-raised">${config.ok}</md-button>
            <md-button type="button" class="md-primary" ng-click="vm.closeFormModal()">${config.cancel}</md-button>`);
            form.append(toolbar, contentWrapper, actionBar);
        } else {
            form.addClass('non-modal-form');
            let title = new XMLGen('h2');
            title.html(config.title);
            let contentWrapper = new XMLGen('div');
            contentWrapper.addClass('form-elements')
                .html(`<div ng-include="'${config.formPath}'"></div>`);
            let actionsWrapper = new XMLGen('div');
            actionsWrapper.addClass('form-actions').html(`<md-button type="submit" class="md-primary md-raised">${config.ok}</md-button>
            <md-button type="button" class="md-primary" ng-click="vm.closeFormModal()">${config.cancel}</md-button>`);
            form.append(title, contentWrapper, actionsWrapper);
        }
        return wrapper;
    }

}
