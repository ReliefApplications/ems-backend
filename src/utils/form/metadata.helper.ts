import get from 'lodash/get';
import { Form, Resource } from '../../models';

export const getMetaData = async (parent: Form | Resource): Promise<any[]> => {
  const metaData = [];

  // ID, Incremental ID
  for (const fieldName of ['id', 'incrementalId']) {
    metaData.push({
      name: fieldName,
      editor: 'text',
      filter: {
        operators: ['eq', 'neq', 'contains', 'doesnotcontain', 'startswith'],
      },
    });
  }

  // Form
  const relatedForms = await Form.find({
    resource: get(parent, 'resource', parent.id),
  }).select('id name');
  metaData.push({
    name: 'form',
    editor: 'select',
    filter: {
      defaultOperator: 'eq',
      operators: ['eq', 'neq'],
    },
    options: relatedForms.map((x) => {
      return {
        text: x.name,
        value: x.id,
      };
    }),
  });

  // CreatedAt, ModifiedAt
  for (const fieldName of ['createdAt', 'modifiedAt']) {
    metaData.push({
      name: fieldName,
      editor: 'datetime',
    });
  }

  for (const field of parent.fields) {
    switch (field.type) {
      case 'radiogroup':
      case 'dropdown': {
        metaData.push({
          name: field.name,
          editor: 'select',
          ...(field.choices && {
            options: field.choices.map((x) => {
              return {
                text: x.text ? x.text : x,
                value: x.value ? x.value : x,
              };
            }),
          }),
        });
        break;
      }
      case 'checkbox':
      case 'tagbox': {
        metaData.push({
          name: field.name,
          editor: 'select',
          multiSelect: true,
          ...(field.choices && {
            options: field.choices.map((x) => {
              return {
                text: x.text ? x.text : x,
                value: x.value ? x.value : x,
              };
            }),
          }),
        });
        break;
      }
      case 'time': {
        metaData.push({
          name: field.name,
          editor: 'time',
        });
        break;
      }
      case 'date': {
        metaData.push({
          name: field.name,
          editor: 'date',
        });
        break;
      }
      case 'datetime':
      case 'datetime-local': {
        metaData.push({
          name: field.name,
          editor: 'datetime',
        });
        break;
      }
      case 'email':
      case 'url':
      case 'comment':
      case 'text': {
        metaData.push({
          name: field.name,
          editor: 'text',
        });
        break;
      }
      case 'boolean': {
        metaData.push({
          name: field.name,
          editor: 'boolean',
        });
        break;
      }
      case 'numeric': {
        metaData.push({
          name: field.name,
          editor: 'numeric',
        });
        break;
      }
      case 'multipletext': {
        metaData.push({
          name: field.name,
          editor: null,
          filterable: false,
        });
        break;
      }
      case 'matrix':
      case 'matrixdropdown':
      case 'matrixdynamic':
      case 'multipletext': {
        metaData.push({
          name: field.name,
          editor: null,
          filterable: false,
        });
        break;
      }
      case 'resource':
      case 'resources': {
        metaData.push({
          name: field.name,
          editor: null,
          filterable: false,
        });
        break;
      }
      default: {
        console.log(field);
        break;
      }
    }
  }

  return metaData;
};
