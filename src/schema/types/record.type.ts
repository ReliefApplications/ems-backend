import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';
import { AppAbility } from '@security/defineUserAbility';
import GraphQLJSON from 'graphql-type-json';
import { FormType, UserType, VersionType } from '.';
import { Form, Resource, Record, Version, User } from '@models';
import { Connection } from './pagination.type';
import getDisplayText from '@utils/form/getDisplayText';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { accessibleBy } from '@casl/mongoose';
import { subject } from '@casl/ability';
import { CalculatedFieldService } from '@services/calculatedField.service';
import { logger } from '@services/logger.service';
import { getErrorMessage, getErrorStack } from '@utils/error';
import get from 'lodash/get';

/**
 * Computes the calculated fields of a record, for the fields the user can read.
 *
 * Calculated fields are not stored on the record, they are built from their
 * expression by the resource queries. The generic record query does not use
 * these queries, so the calculated fields must be computed on the fly when
 * they are requested.
 *
 * @param record Record to compute the calculated fields of
 * @param source Form or resource the record belongs to
 * @param context GraphQL context
 * @returns Values of the accessible calculated fields, by field name
 */
const getCalculatedFieldsValues = async (
  record: any,
  source: Form | Resource,
  context: any
): Promise<{ [name: string]: any }> => {
  const calculatedFields = (source.fields || []).filter(
    (field: any) => field.isCalculated && field.expression && field.name
  );
  if (calculatedFields.length === 0) {
    return {};
  }
  try {
    // Same field-level permissions as the ones applied on stored fields
    const ability = await extendAbilityForRecords(context.user, source);
    const accessibleFields = calculatedFields.filter((field: any) =>
      ability.can('read', subject('Record', record), `data.${field.name}`)
    );
    if (accessibleFields.length === 0) {
      return {};
    }
    const calculatedFieldService = new CalculatedFieldService(
      { _id: source._id, fields: source.fields, name: source.name },
      context,
      context.timeZone,
      context.user?.attributes || {}
    );
    const stages = [];
    for (const field of accessibleFields) {
      stages.push(
        ...(await calculatedFieldService.build(field.expression, field.name))
      );
    }
    const [computed] = await Record.aggregate([
      { $match: { _id: record._id ?? record.id } },
      ...stages,
    ]);
    return accessibleFields.reduce(
      (values, field: any) => ({
        ...values,
        [field.name]: get(computed, `data.${field.name}`, null),
      }),
      {}
    );
  } catch (err) {
    // A broken expression should not prevent the record from being displayed
    logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
    return {};
  }
};

/** GraphQL Record type definition */
export const RecordType = new GraphQLObjectType({
  name: 'Record',
  fields: () => ({
    id: { type: GraphQLID },
    incrementalId: { type: GraphQLID },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    archived: { type: GraphQLBoolean },
    form: {
      type: FormType,
      async resolve(parent, args, context) {
        const form = await Form.findById(parent.form);
        const ability = await extendAbilityForRecords(context.user, form);
        if (ability.can('read', form)) {
          return form;
        }
      },
    },
    resource: {
      type: FormType,
      async resolve(parent, args, context) {
        const resource = await Resource.findById(parent.resource);
        const ability = await extendAbilityForRecords(context.user, resource);
        if (ability.can('read', resource)) {
          return resource;
        }
      },
    },
    data: {
      type: GraphQLJSON,
      args: {
        display: { type: GraphQLBoolean },
        replaceTranslations: {
          type: GraphQLBoolean,
          defaultValue: false,
        },
        calculatedFields: {
          type: GraphQLBoolean,
          defaultValue: false,
        },
      },
      async resolve(parent, args, context) {
        let lang = context.locale;
        if (lang) {
          lang = lang.toLowerCase();
        }

        const source =
          args.display ||
          args.calculatedFields ||
          (lang && args.replaceTranslations)
            ? parent.resource
              ? await Resource.findById(parent.resource).select(
                  'name fields permissions'
                )
              : await Form.findById(parent.form).select(
                  'name fields permissions resource'
                )
            : null;

        const data = parent.data ? { ...parent.data } : {};

        // Calculated fields are not stored: only compute them when requested
        if (args.calculatedFields && source) {
          Object.assign(
            data,
            await getCalculatedFieldsValues(parent, source, context)
          );
        }

        // Replace fields with translated versions when available
        if (lang && args.replaceTranslations && source && source.fields) {
          for (const field of source.fields) {
            if (field.translateField && field.translateTo) {
              const targetLang = field.translateTo.toLowerCase();
              if (targetLang === lang) {
                const targetField = field.name;
                const sourceField = field.translateField;
                if (
                  data[targetField] !== undefined &&
                  data[targetField] !== null &&
                  data[targetField] !== ''
                ) {
                  data[sourceField] = data[targetField];
                }
                delete data[targetField];
              }
            }
          }
        }

        if (args.display && source) {
          const res = {};
          for (const field of source.fields) {
            const name = field.name;
            if (data[name] !== undefined && data[name] !== null) {
              res[name] = data[name];
              // Get the display field from the linked record if any
              if (field.resource && field.displayField) {
                try {
                  const record = await Record.findOne({
                    _id: data[name],
                    archived: { $ne: true },
                  });
                  res[name] = record.data[field.displayField];
                } catch {
                  res[name] = null;
                }
              }
              // Get the text instead of the value for choices, fetch it if needed.
              if (
                field.choices ||
                field.choicesByUrl ||
                field.choicesByGraphQL
              ) {
                res[name] = await getDisplayText(field, data[name], context);
              }
            } else {
              res[name] = null;
            }
          }
          return res;
        }
        return data;
      },
    },
    versions: {
      type: new GraphQLList(VersionType),
      async resolve(parent) {
        const versions = await Version.find().where('_id').in(parent.versions);
        return versions;
      },
    },
    createdBy: {
      type: UserType,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const user = await User.findOne({
          _id: parent.createdBy.user,
          ...accessibleBy(ability, 'read').User,
        });
        return user;
      },
    },
    modifiedBy: {
      type: UserType,
      async resolve(parent) {
        if (parent.versions && parent.versions.length > 0) {
          const lastVersion = await Version.findById(parent.versions.pop());
          if (lastVersion) {
            const user = await User.findById(lastVersion.createdBy);
            return user;
          }
        }
        if (parent.createdBy && parent.createdBy.user) {
          // if no version yet, the last modifier is the creator
          const user = await User.findById(parent.createdBy.user);
          return user;
        } else {
          return null;
        }
      },
    },
    validationErrors: {
      type: new GraphQLList(
        new GraphQLObjectType({
          name: 'ValidationError',
          fields: () => ({
            question: { type: GraphQLString },
            errors: { type: new GraphQLList(GraphQLString) },
          }),
        })
      ),
    },
    canUpdate: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const parentForm: Form = await Form.findById(
          parent.form,
          'fields permissions resource structure'
        );
        const ability = await extendAbilityForRecords(context.user, parentForm);
        return ability.can('update', parent);
      },
    },
  }),
});

/** GraphQL record connection type definition */
export const RecordConnectionType = Connection(RecordType);
