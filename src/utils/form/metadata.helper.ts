import { Form, Resource, User, Role, ReferenceData } from '@models';
import mongoose from 'mongoose';
import { sortBy } from 'lodash';
import extendAbilityForRecords from '@security/extendAbilityForRecords';

export type Metadata = {
  automated?: boolean;
  name: string;
  type?: string;
  editor?: string;
  filter?: { defaultOperator?: string; operators: string[] };
  canSee?: boolean;
  canUpdate?: boolean;
  multiSelect?: boolean;
  filterable?: boolean;
  options?: { text: string; value: any }[];
  fields?: Metadata[];
  _field?: any;
  _referenceData?: ReferenceData;
};

/**
 * Build options for users metadata fields.
 *
 * @param applications list of applications from which users should come.
 * @returns options for users metadata field.
 */
export const getUsersOptions = async (applications: undefined | string[]) => {
  let users: User[] = [];
  if (applications && applications.length > 0) {
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
                  applications.map((x) => mongoose.Types.ObjectId(x)),
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
  return (
    users
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
  });
};

/**
 * Build options for owner metadata fields.
 *
 * @param applications list of applications from which roles should come.
 * @returns options for owner metadata field.
 */
export const getOwnerOptions = async (applications: string[]) => {
  let roles: Role[] = [];
  roles = await Role.find({
    application: {
      $in: applications.map((x) => mongoose.Types.ObjectId(x)),
    },
  })
    .select('id title application')
    .populate({
      path: 'application',
      model: 'Application',
    });

  return roles.map((x) => {
    return {
      text: `${x.application.name} - ${x.title}`,
      value: x.id,
    };
  });
};

/**
 * Build fields for reference data metadata.
 *
 * @param field Parent field.
 * @returns Reference data sub fields.
 */
export const getReferenceDataFields = async (
  field: any
): Promise<Metadata[]> => {
  const referenceData = await ReferenceData.findById(
    field.referenceData.id
  ).populate({
    path: 'apiConfiguration',
    model: 'ApiConfiguration',
    select: { name: 1, endpoint: 1, graphQLEndpoint: 1 },
  });
  return referenceData.fields.map((fieldName) => ({
    name: fieldName,
    type: field.type,
    editor: 'select',
    multiSelect: ['checkbox', 'tagbox'].includes(field.type),
    _referenceData: referenceData,
  }));
};

/**
 * Get MetaData from form definition.
 *
 * @param parent form or resource
 * @param context request context
 * @param root indicate if this is the root metadata call. For nested ones this should be set to false.
 * @returns Promise of fields metadata
 */
export const getMetaData = async (
  parent: Form | Resource,
  context: any,
  root = true
): Promise<any[]> => {
  const metaData: Metadata[] = [];
  context._parent = parent;
  context.user._abilityForRecords = await extendAbilityForRecords(
    context.user,
    parent
  );

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
      canUpdate: false,
    });
  }

  // Form
  metaData.push({
    automated: true,
    name: 'form',
    editor: 'select',
    filter: {
      defaultOperator: 'eq',
      operators: ['eq', 'neq'],
    },
    canUpdate: false,
  });

  // CreatedBy, LastUpdatedBy
  for (const fieldName of ['createdBy', 'lastUpdatedBy']) {
    metaData.push({
      automated: true,
      name: fieldName,
      editor: null,
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
      canUpdate: false,
    });
  }

  /**
   * Generic field metadata
   *
   * @param field resource field
   */
  const getFieldMetaData = (field: any) => {
    const fieldMeta: Metadata = {
      name: field.name,
      type: field.type,
      editor: null,
    };
    switch (field.type) {
      case 'radiogroup':
      case 'dropdown': {
        fieldMeta.editor = 'select';
        fieldMeta._field = field;
        break;
      }
      case 'checkbox':
      case 'tagbox': {
        fieldMeta.editor = 'select';
        fieldMeta.multiSelect = true;
        fieldMeta._field = field;
        break;
      }
      case 'time': {
        fieldMeta.editor = 'time';
        break;
      }
      case 'date': {
        fieldMeta.editor = 'date';
        break;
      }
      case 'datetime':
      case 'datetime-local': {
        fieldMeta.editor = 'datetime';
        break;
      }
      case 'email':
      case 'url':
      case 'comment':
      case 'text': {
        fieldMeta.editor = 'text';
        break;
      }
      case 'boolean': {
        fieldMeta.editor = 'boolean';
        break;
      }
      case 'numeric': {
        fieldMeta.editor = 'numeric';
        break;
      }
      case 'multipletext': {
        fieldMeta.editor = 'datetime';
        break;
      }
      case 'matrix':
      case 'matrixdropdown':
      case 'matrixdynamic':
      case 'multipletext': {
        fieldMeta.filterable = false;
        break;
      }
      case 'resource':
      case 'resources': {
        fieldMeta.filterable = root;
        fieldMeta._field = field;
        break;
      }
      case 'file': {
        fieldMeta.filter = {
          defaultOperator: 'isnotnull',
          operators: ['isnull', 'isnotnull'],
        };
        break;
      }
      case 'users': {
        fieldMeta.editor = 'select';
        fieldMeta.multiSelect = true;
        fieldMeta._field = field;
        break;
      }
      case 'owner': {
        fieldMeta.editor = 'select';
        fieldMeta.multiSelect = true;
        fieldMeta._field = field;
        break;
      }
      default: {
        break;
      }
    }
    metaData.push(fieldMeta);
  };

  // Classic fields
  for (const field of parent.fields) {
    getFieldMetaData(field);
  }

  return sortBy(metaData, (x) => x.name);
};
