import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLError
} from 'graphql';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { AccessType, ApplicationType } from '.';
import { ContentEnumType } from '@const/enumTypes';
import { Application } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import GraphQLJSON from 'graphql-type-json';
import { logger } from '@services/logger.service';

/** GraphQL page type type definition */
export const PageType = new GraphQLObjectType({
  name: 'Page',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id;
      },
    },
    name: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    type: { type: ContentEnumType },
    content: { type: GraphQLID },
    context: {
      type: GraphQLJSON,
      async resolve(parent, args, context) {
        try{
          const ability = await extendAbilityForPage(context.user, parent);
          if (ability.can('read', parent))
            return parent.context?.displayField ? parent.context : null;
          return null;
        }catch (err){
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
    contentWithContext: {
      type: GraphQLJSON,
      async resolve(parent, args, context) {
        try{
          const ability = await extendAbilityForPage(context.user, parent);
          if (ability.can('read', parent)) return parent.contentWithContext;
          return null;
        }catch (err){
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
    permissions: {
      type: AccessType,
      async resolve(parent, args, context) {
        try{
          const ability = await extendAbilityForPage(context.user, parent);
          if (ability.can('update', parent)) {
            return parent.permissions;
          }
          return null;
        }catch (err){
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
    application: {
      type: ApplicationType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const application = Application.findOne(
          Application.accessibleBy(ability, 'read')
            .where({ pages: parent._id })
            .getFilter()
        );
        if(!application){
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
        }else{
          return application;
        }
      },
    },
    canSee: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        try{
          const ability = await extendAbilityForPage(context.user, parent);
          return ability.can('read', parent);
        }catch (err){
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
    canUpdate: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        try{
          const ability = await extendAbilityForPage(context.user, parent);
          return ability.can('update', parent);
        }catch (err){
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
    canDelete: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        try{
          const ability = await extendAbilityForPage(context.user, parent);
          return ability.can('delete', parent);
        }catch (err){
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
  }),
});
