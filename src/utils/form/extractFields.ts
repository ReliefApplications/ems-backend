import { questionType } from '@services/form.service';
import { GraphQLError } from 'graphql/error';
import { getFieldType } from './getFieldType';
import i18next from 'i18next';
import { validateGraphQLFieldName } from '@utils/validators';

/**
 * Push in fields array all detected fields in the json structure of object.
 * Function by induction.
 *
 * @param object form structure object, page or panel
 * @param fields list of fields
 * @param core is the form core ?
 */
export const extractFields = async (object, fields, core): Promise<void> => {
  if (object.elements) {
    for (const element of object.elements) {
      if (element.type === 'panel') {
        await extractFields(element, fields, core);
      } else {
        if (!element.valueName) {
          throw new GraphQLError(
            i18next.t('utils.form.extractFields.errors.missingDataField')
          );
        }
        validateGraphQLFieldName(element.valueName, i18next);
        const type = await getFieldType(element);
        const field = {
          type,
          name: element.valueName,
          isRequired: element.isRequired ? element.isRequired : false,
          readOnly: element.readOnly ? element.readOnly : false,
          isCore: core,
          ...(element.hasOwnProperty('defaultValue')
            ? { defaultValue: element.defaultValue }
            : {}),
        };
        // ** Resource **
        if (element.type === 'resource' || element.type === 'resources') {
          if (element.relatedName) {
            validateGraphQLFieldName(element.relatedName, i18next);
            Object.assign(
              field,
              {
                resource: element.resource,
                displayField: element.displayField,
                relatedName: element.relatedName,
              },
              element.displayAsGrid && { displayAsGrid: element.displayAsGrid },
              element.canAddNew && { canAddNew: element.canAddNew },
              element.addTemplate && { addTemplate: element.addTemplate },
              element.gridFieldsSettings && {
                gridFieldsSettings: element.gridFieldsSettings,
              }
            );
          } else {
            throw new GraphQLError(
              i18next.t('utils.form.extractFields.errors.missingRelatedField', {
                name: element.valueName,
              })
            );
          }
        }
        // ** Multiple texts **
        if (field.type === questionType.MULTIPLE_TEXT) {
          Object.assign(field, {
            items: element.items.map((x) => {
              return {
                name: x.name,
                label: x.title ? x.title : x.name,
              };
            }),
          });
        }
        // ** Dynamic matrix **
        if (field.type === questionType.MATRIX_DROPDOWN) {
          Object.assign(field, {
            rows: element.rows.map((x) => {
              return {
                name: x.value ? x.value : x,
                label: x.text ? x.text : x,
              };
            }),
            columns: element.columns.map((x) => {
              return {
                name: x.name,
                label: x.title,
                type: x.cellType ? x.cellType : element.cellType,
              };
            }),
            choices: element.choices.map((x) => {
              return {
                value: x.value ? x.value : x,
                text: x.text ? x.text : x,
              };
            }),
          });
        }
        // ** Single choice matrix **
        if (field.type === questionType.MATRIX) {
          Object.assign(field, {
            rows: element.rows.map((x) => {
              return {
                name: x.value ? x.value : x,
                label: x.text ? x.text : x,
              };
            }),
            columns: element.columns.map((x) => {
              return {
                name: x.value ? x.value : x,
                label: x.text ? x.text : x,
              };
            }),
          });
        }
        // ** Dynamic rows matrix **
        if (field.type === questionType.MATRIX_DYNAMIC) {
          Object.assign(field, {
            columns: element.columns.map((x) => {
              return {
                name: x.name,
                type: x.cellType,
                label: x.title,
              };
            }),
            choices: element.choices.map((x) => {
              return {
                value: x.value ? x.value : x,
                text: x.text ? x.text : x,
              };
            }),
          });
        }
        // ** Dropdown / Radio / Checkbox / Tagbox **
        if (
          field.type === questionType.DROPDOWN ||
          field.type === questionType.RADIO_GROUP ||
          field.type === questionType.CHECKBOX ||
          field.type === questionType.TAGBOX
        ) {
          if (element.choicesByUrl) {
            Object.assign(field, {
              choicesByUrl: {
                url: element.choicesByUrl.url
                  ? element.choicesByUrl.url
                  : element.choicesByUrl,
                ...(element.choicesByUrl.path && {
                  path: element.choicesByUrl.path,
                }),
                value: element.choicesByUrl.valueName
                  ? element.choicesByUrl.valueName
                  : 'name',
                text: element.choicesByUrl.titleName
                  ? element.choicesByUrl.titleName
                  : 'name',
                hasOther: element.hasOther,
                otherText: element.otherText ? element.otherText : 'Other',
              },
            });
          } else if (element.gqlUrl) {
            Object.assign(field, {
              choicesByGraphQL: {
                url: element.gqlUrl,
                ...(element.gqlPath && {
                  path: element.gqlPath,
                }),
                value: element.gqlValueName ? element.gqlValueName : 'value',
                text: element.gqlTitleName ? element.gqlTitleName : 'name',
                query: element.gqlQuery ? element.gqlQuery : null,
                variableMapping: element.gqlVariableMapping
                  ? element.gqlVariableMapping
                  : null,
                hasOther: element.hasOther,
                otherText: element.otherText ? element.otherText : 'Other',
              },
            });
          } else if (element.referenceData) {
            Object.assign(field, {
              referenceData: {
                id: element.referenceData,
                displayField: element.referenceDataDisplayField,
              },
            });
          } else {
            const choices = (element.choices || []).map((x) => {
              return {
                value: x.value || x,
                text: x.text || x,
              };
            });
            if (element.hasOther) {
              Object.assign(field, {
                hasOther: true,
                otherText: element.otherText,
                otherPlaceHolder: element.otherPlaceHolder,
              });
              choices.push({
                value: 'other',
                text: element.otherText ? element.otherText : 'Other',
              });
            }
            Object.assign(field, {
              choices,
            });
          }
        }
        // ** Owner **
        if (field.type === questionType.OWNER) {
          Object.assign(field, { applications: element.applications });
        }
        // ** Comments **
        if (
          element.hasComment ||
          element.hasOther ||
          element.showCommentArea ||
          element.showOtherItem
        ) {
          fields.push({
            type: 'text',
            name: `${element.valueName}_comment`,
            isCore: core,
            generated: true,
          });
        }
        // ** Users **
        if (field.type === questionType.USERS) {
          Object.assign(field, { applications: element.applications });
        }
        fields.push(field);
      }
    }
  }
};
