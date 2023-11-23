import { GraphQLError } from 'graphql/error';
import { getFieldType } from './getFieldType';
import i18next from 'i18next';
import { validateGraphQLFieldName } from '@utils/validators';
import { isNil } from 'lodash';

/**
 * Push in fields array all detected fields in the json structure of object.
 * Function by induction.
 *
 * @param object form structure object, page or panel
 * @param fields list of fields
 * @param core is the form core ?
 * @param graphqlQueries survey graphql queries
 */
export const extractFields = async (
  object,
  fields,
  core,
  graphqlQueries
): Promise<void> => {
  if (object.elements) {
    for (const element of object.elements) {
      if (element.type === 'panel') {
        await extractFields(element, fields, core, graphqlQueries);
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
        if (field.type === 'multipletext') {
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
        if (field.type === 'matrixdropdown') {
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
        if (field.type === 'matrix') {
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
        if (field.type === 'matrixdynamic') {
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
          field.type === 'dropdown' ||
          field.type === 'radiogroup' ||
          field.type === 'checkbox' ||
          field.type === 'tagbox'
        ) {
          if (element.graphqlQuery) {
            // Get the graphql query from the survey by the name
            const query = graphqlQueries.find(
              (x) => x.name === element.graphqlQuery
            );

            const variables: Record<
              string,
              {
                question: string;
                required: boolean;
              }
            > = {};

            Object.keys(query.variables).forEach((key) => {
              const variable = query.variables[key];

              // Remove surveyJS artifacts
              if (isNil(variable.required)) {
                return;
              }

              variables[key] = {
                question: variable.question,
                required: variable.required,
              };
            });

            Object.assign(field, {
              choicesByGraphql: {
                query: {
                  query: query.query,
                  url: query.url,
                  variables,
                },
                path: element.path,
                dataKey: element.dataKey,
                displayKey: element.displayKey,
              },
            });
          } else if (element.choicesByUrl) {
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
          } else if (element.referenceData) {
            Object.assign(field, {
              referenceData: {
                id: element.referenceData,
                displayField: element.referenceDataDisplayField,
              },
            });
          } else {
            const choices = element.choices.map((x) => {
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
        if (field.type === 'owner') {
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
        if (field.type === 'users') {
          Object.assign(field, { applications: element.applications });
        }
        fields.push(field);
      }
    }
  }
};
