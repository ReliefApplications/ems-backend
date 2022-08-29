import get from 'lodash/get';
import { Form, Resource, User, Role } from '../../models';
import mongoose from 'mongoose';
import { sortBy } from 'lodash';

/**
 * Build meta data for users fields.
 *
 * @param field field to get metadata of
 * @returns metadata
 */
export const getUsersMetaData = async (field: any) => {
  let users: User[] = [];
  const metaData = {
    name: field.name,
    editor: 'select',
    multiSelect: true,
  };
  if (field.applications && field.applications.length > 0) {
    const aggregations = [
      // Left join
      {
        $lookup: {
          from: 'roles',
          localField: 'roles',
          foreignField: '_id',
          as: 'roles',
        },
      },
      // Replace the roles field with a filtered array, containing only roles that are part of the application(s).
      {
        $addFields: {
          roles: {
            $filter: {
              input: '$roles',
              as: 'role',
              cond: {
                $in: [
                  '$$role.application',
                  field.applications.map((x) => mongoose.Types.ObjectId(x)),
                ],
              },
            },
          },
        },
      },
      // Filter users that have at least one role in the application(s).
      { $match: { 'roles.0': { $exists: true } } },
    ];
    users = await User.aggregate(aggregations);
  } else {
    users = await User.find();
  }
  return Object.assign(metaData, {
    options: (users
      ? users.map((x) => {
          return {
            text: x.username,
            value: x._id,
          };
        })
      : []
    ).concat({
      text: 'Current user',
      value: 'me',
    }),
  });
};

/**
 * Get metadata of roles field (owner)
 *
 * @param field field to get metadata of
 * @returns metadata
 */
export const getRolesMetaData = async (field: any) => {
  const metaData = {
    name: field.name,
    editor: 'select',
    multiSelect: true,
  };
  const roles = await Role.find({
    application: {
      $in: field.applications.map((x) => mongoose.Types.ObjectId(x)),
    },
  })
    .select('id title application')
    .populate({
      path: 'application',
      model: 'Application',
    });
  return Object.assign(metaData, {
    options: roles.map((x) => {
      return {
        text: `${x.application.name} - ${x.title}`,
        value: x.id,
      };
    }),
  });
};

/**
 * Get MetaData from form definition.
 *
 * @param parent form or resource
 * @returns Promise of fields metadata
 */
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

  // CreatedBy, ModifiedBy
  for (const fieldName of ['createdBy', 'modifiedBy']) {
    metaData.push({
      name: fieldName,
      editor: null,
      fields: [
        {
          name: 'id',
          editor: 'text',
          filter: {
            operators: [
              'eq',
              'neq',
              'contains',
              'doesnotcontain',
              'startswith',
            ],
          },
        },
        {
          name: 'username',
          editor: 'text',
        },
        {
          name: 'name',
          editor: 'text',
        },
      ],
    });
  }

  // CreatedAt, ModifiedAt
  for (const fieldName of ['createdAt', 'modifiedAt']) {
    metaData.push({
      name: fieldName,
      editor: 'datetime',
    });
  }

  // Classic fields
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
      case 'users': {
        metaData.push(await getUsersMetaData(field));
        break;
      }
      case 'owner': {
        metaData.push(await getRolesMetaData(field));
        break;
      }
      default: {
        console.log(field);
        break;
      }
    }
  }

  return sortBy(metaData, (x) => x.name);
};
