import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLError,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { AccessType, PageType, StepType } from '.';
import { Page, Step } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';
import extendAbilityForPage from '@security/extendAbilityForPage';
import extendAbilityForStep from '@security/extendAbilityForStep';
import { logger } from '@services/logger.service';

/** GraphQL dashboard type definition */
export const DashboardType = new GraphQLObjectType({
  name: 'Dashboard',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    structure: { type: GraphQLJSON },
    permissions: {
      type: AccessType,
      async resolve(parent, args, context) {
        try {
          const parentId = parent.id || parent._id;
          const ability = await extendAbilityForContent(context.user, parent);
          if (ability.can('update', parent)) {
            const page = await Page.findOne({
              $or: [
                { content: parentId },
                { contentWithContext: { $elemMatch: { content: parentId } } },
              ],
            });
            if (page) {
              return page.permissions;
            } else {
              const step = await Step.findOne({ content: parentId });
              if (!step) {
                throw new GraphQLError(
                  context.i18next.t('common.errors.dataNotFound')
                );
              } else {
                return step.permissions;
              }
            }
          }
          return null;
        } catch (err) {
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
    page: {
      type: PageType,
      async resolve(parent, args, context) {
        try {
          const parentId = parent.id || parent._id;
          const page = await Page.findOne({
            $or: [
              { content: parentId },
              { contentWithContext: { $elemMatch: { content: parentId } } },
            ],
          });
          if (!page) {
            throw new GraphQLError(
              context.i18next.t('common.errors.dataNotFound')
            );
          } else {
            const ability = await extendAbilityForPage(context.user, page);
            if (ability.can('read', page)) {
              return page;
            }
          }
        } catch (err) {
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
    step: {
      type: StepType,
      async resolve(parent, args, context) {
        try {
          const step = await Step.findOne({ content: parent.id || parent._id });
          if (!step) {
            throw new GraphQLError(
              context.i18next.t('common.errors.dataNotFound')
            );
          } else {
            const ability = await extendAbilityForStep(context.user, step);
            if (ability.can('read', step)) {
              return step;
            }
          }
        } catch (err) {
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
    canSee: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        try {
          const ability = await extendAbilityForContent(context.user, parent);
          return ability.can('read', parent);
        } catch (err) {
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
        try {
          const ability = await extendAbilityForContent(context.user, parent);
          return ability.can('update', parent);
        } catch (err) {
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
        try {
          const ability = await extendAbilityForContent(context.user, parent);
          return ability.can('delete', parent);
        } catch (err) {
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
  }),
});
