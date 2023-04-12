import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
  GraphQLError
} from 'graphql';
import { AppAbility } from '@security/defineUserAbility';
import GraphQLJSON from 'graphql-type-json';
import { FormType, UserType, VersionType } from '.';
import { Form, Resource, Record, Version, User } from '@models';
import { Connection } from './pagination.type';
import getDisplayText from '@utils/form/getDisplayText';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { logger } from '@services/logger.service';

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
        try{
          const form = await Form.findById(parent.form);
          const ability = await extendAbilityForRecords(context.user, form);
          if (ability.can('read', form)) {
            return form;
          }
        }catch (err){
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
    data: {
      type: GraphQLJSON,
      args: {
        display: { type: GraphQLBoolean },
      },
      async resolve(parent, args, context) {
        try{
          if (args.display) {
            const source = parent.resource
              ? await Resource.findById(parent.resource)
              : await Form.findById(parent.form);
            if (source) {
              const res = {};
              for (const field of source.fields) {
                const name = field.name;
                if (parent.data[name]) {
                  res[name] = parent.data[name];
                  // Get the display field from the linked record if any
                  if (field.resource && field.displayField) {
                    try {
                      const record = await Record.findOne({
                        _id: parent.data[name],
                        archived: { $ne: true },
                      });
                      if(!record){
                        throw new GraphQLError(
                          context.i18next.t('common.errors.dataNotFound')
                        );
                      }
                      res[name] = record.data[field.displayField];
                    } catch {
                      res[name] = null;
                    }
                  }
                  // Get the text instead of the value for choices, fetch it if needed.
                  if (field.choices || field.choicesByUrl) {
                    res[name] = await getDisplayText(
                      field,
                      parent.data[name],
                      context
                    );
                  }
                } else {
                  res[name] = null;
                }
              }
              return res;
            }
          }
          return parent.data;
        }catch (err){
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
    versions: {
      type: new GraphQLList(VersionType),
      resolve(parent) {
        return Version.find().where('_id').in(parent.versions);
      },
    },
    createdBy: {
      type: UserType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return User.findById(parent.createdBy.user).accessibleBy(
          ability,
          'read'
        );
      },
    },
    modifiedBy: {
      type: UserType,
      async resolve(parent) {
        if (parent.versions && parent.versions.length > 0) {
          const lastVersion = await Version.findById(parent.versions.pop());
          if (lastVersion) {
            return User.findById(lastVersion.createdBy);
          }
        }
        if (parent.createdBy && parent.createdBy.user) {
          // if no version yet, the last modifier is the creator
          return User.findById(parent.createdBy.user);
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
  }),
});

/** GraphQL record connection type definition */
export const RecordConnectionType = Connection(RecordType);
