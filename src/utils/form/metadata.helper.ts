import get from 'lodash/get';
import { Form, Resource, User, Role } from '@models';
import mongoose from 'mongoose';
import { sortBy } from 'lodash';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { AppAbility } from '@security/defineUserAbility';
import { getFullChoices } from './getDisplayText';

/**
 * Build meta data for users fields.
 *
 * @param parent form or resource object
 * @param ability user ability
 * @param field field to get metadata of
 * @returns metadata
 */
export const getUsersMetaData = async (
  parent: Form | Resource,
  ability: AppAbility,
  field: any
) => {
  let users: User[] = [];
  const metaData = {
    name: field.name,
    editor: 'select',
    multiSelect: true,
    canSee: ability.can('read', parent, `data.${field.name}`),
    canUpdate: ability.can('update', parent, `data.${field.name}`),
  };
  if (metaData.canSee) {
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
 * @param parent form or resource object
 * @param ability user ability
 * @param field field to get metadata of
 * @returns metadata
 */
export const getRolesMetaData = async (
  parent: Form | Resource,
  ability: AppAbility,
  field: any
) => {
  let roles: Role[] = [];
  const metaData = {
    name: field.name,
    editor: 'select',
    multiSelect: true,
    canSee: ability.can('read', parent, `data.${field.name}`),
    canUpdate: ability.can('update', parent, `data.${field.name}`),
  };

  if (metaData.canSee) {
    roles = await Role.find({
      application: {
        $in: field.applications.map((x) => mongoose.Types.ObjectId(x)),
      },
    })
      .select('id title application')
      .populate({
        path: 'application',
        model: 'Application',
      });
  }

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
 * @param context request context
 * @param level indicate nested level of metadata. We stop adding fields to resources at 1
 * @returns Promise of fields metadata
 */
export const getMetaData = async (
  parent: Form | Resource,
  context: any,
  level = 0
): Promise<any[]> => {
  const metaData = [];
  const ability = await extendAbilityForRecords(context.user, parent);

  // In order to handle parallel execution
  const promises: Promise<any>[] = [];

  // ID, Incremental ID
  for (const fieldName of ['id', 'incrementalId']) {
    metaData.push({
      automated: true,
      name: fieldName,
      type: 'text',
      editor: 'text',
      filter: {
        operators: ['eq', 'neq', 'contains', 'doesnotcontain', 'startswith'],
      },
      canSee: ability.can('read', parent, `data.${fieldName}`),
      canUpdate: false,
    });
  }

  // Form
  const getFormMetaData = async () => {
    const relatedForms = await Form.find({
      resource: get(parent, 'resource', parent.id),
    }).select('id name');
    metaData.push({
      automated: true,
      name: 'form',
      editor: 'select',
      filter: {
        defaultOperator: 'eq',
        operators: ['eq', 'neq'],
      },
      canSee: ability.can('read', parent, 'data.form'),
      canUpdate: false,
      options: relatedForms.map((x) => {
        return {
          text: x.name,
          value: x.id,
        };
      }),
    });
  };
  promises.push(getFormMetaData());

  // CreatedBy, ModifiedBy
  for (const fieldName of ['createdBy', 'modifiedBy']) {
    metaData.push({
      automated: true,
      name: fieldName,
      editor: null,
      canSee: ability.can('read', parent, `data.${fieldName}`),
      canUpdate: false,
      fields: [
        {
          name: 'id',
          type: 'text',
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
          type: 'text',
          editor: 'text',
        },
        {
          name: 'name',
          type: 'text',
          editor: 'text',
        },
      ],
    });
  }

  // CreatedAt, ModifiedAt
  for (const fieldName of ['createdAt', 'modifiedAt']) {
    metaData.push({
      automated: true,
      name: fieldName,
      type: 'datetime',
      editor: 'datetime',
      canSee: ability.can('read', parent, `data.${fieldName}`),
      canUpdate: false,
    });
  }

  /**
   * Generic field metadata
   *
   * @param field resource field
   */
  const getFieldMetaData = async (field: any) => {
    switch (field.type) {
      case 'radiogroup':
      case 'dropdown': {
        let options = [];
        if (field.choicesByUrl) {
          options = await getFullChoices(field, context);
        } else {
          options = get(field, 'choices', []).map((x) => {
            return {
              text: get(x, 'text', x),
              value: get(x, 'value', x),
            };
          });
        }
        metaData.push({
          name: field.name,
          type: field.type,
          editor: 'select',
          canSee: ability.can('read', parent, `data.${field.name}`),
          canUpdate: ability.can('update', parent, `data.${field.name}`),
          options,
        });
        break;
      }
      case 'checkbox':
      case 'tagbox': {
        let options = [];
        if (field.choicesByUrl) {
          options = await getFullChoices(field, context);
        } else {
          options = get(field, 'choices', []).map((x) => {
            return {
              text: get(x, 'text', x),
              value: get(x, 'value', x),
            };
          });
        }
        metaData.push({
          name: field.name,
          type: field.type,
          editor: 'select',
          canSee: ability.can('read', parent, `data.${field.name}`),
          canUpdate: ability.can('update', parent, `data.${field.name}`),
          multiSelect: true,
          options,
        });
        break;
      }
      case 'time': {
        metaData.push({
          name: field.name,
          type: field.type,
          editor: 'time',
          canSee: ability.can('read', parent, `data.${field.name}`),
          canUpdate: ability.can('update', parent, `data.${field.name}`),
        });
        break;
      }
      case 'date': {
        metaData.push({
          name: field.name,
          type: field.type,
          editor: 'date',
          canSee: ability.can('read', parent, `data.${field.name}`),
          canUpdate: ability.can('update', parent, `data.${field.name}`),
        });
        break;
      }
      case 'datetime':
      case 'datetime-local': {
        metaData.push({
          name: field.name,
          type: field.type,
          editor: 'datetime',
          canSee: ability.can('read', parent, `data.${field.name}`),
          canUpdate: ability.can('update', parent, `data.${field.name}`),
        });
        break;
      }
      case 'email':
      case 'url':
      case 'comment':
      case 'text': {
        metaData.push({
          name: field.name,
          type: field.type,
          editor: 'text',
          canSee: ability.can('read', parent, `data.${field.name}`),
          canUpdate: ability.can('update', parent, `data.${field.name}`),
        });
        break;
      }
      case 'boolean': {
        metaData.push({
          name: field.name,
          type: field.type,
          editor: 'boolean',
          canSee: ability.can('read', parent, `data.${field.name}`),
          canUpdate: ability.can('update', parent, `data.${field.name}`),
        });
        break;
      }
      case 'numeric': {
        metaData.push({
          name: field.name,
          type: field.type,
          editor: 'numeric',
          canSee: ability.can('read', parent, `data.${field.name}`),
          canUpdate: ability.can('update', parent, `data.${field.name}`),
        });
        break;
      }
      case 'multipletext': {
        metaData.push({
          name: field.name,
          type: field.type,
          editor: null,
          filterable: false,
          canSee: ability.can('read', parent, `data.${field.name}`),
          canUpdate: ability.can('update', parent, `data.${field.name}`),
        });
        break;
      }
      case 'matrix':
      case 'matrixdropdown':
      case 'matrixdynamic':
      case 'multipletext': {
        metaData.push({
          name: field.name,
          type: field.type,
          editor: null,
          filterable: false,
          canSee: ability.can('read', parent, `data.${field.name}`),
          canUpdate: ability.can('update', parent, `data.${field.name}`),
        });
        break;
      }
      case 'resource':
      case 'resources': {
        metaData.push({
          name: field.name,
          type: field.type,
          editor: null,
          canSee: ability.can('read', parent, `data.${field.name}`),
          canUpdate: ability.can('update', parent, `data.${field.name}`),
          filterable: level === 0,
          ...(level === 0 && {
            fields: await getMetaData(
              await Resource.findById(field.resource),
              context,
              level + 1
            ),
          }),
        });
        break;
      }
      case 'file': {
        metaData.push({
          name: field.name,
          type: field.type,
          editor: null,
          filter: {
            defaultOperator: 'isnotnull',
            operators: ['isnull', 'isnotnull'],
          },
          canSee: ability.can('read', parent, `data.${field.name}`),
          canUpdate: ability.can('update', parent, `data.${field.name}`),
        });
        break;
      }
      case 'users': {
        metaData.push(await getUsersMetaData(parent, ability, field));
        break;
      }
      case 'owner': {
        metaData.push(await getRolesMetaData(parent, ability, field));
        break;
      }
      default: {
        break;
      }
    }
  };

  // Classic fields
  for (const field of parent.fields) {
    promises.push(getFieldMetaData(field));
  }

  await Promise.all(promises);

  return sortBy(metaData, (x) => x.name);
};
