import {
    GraphQLNonNull,
    GraphQLID,
    GraphQLError,
    GraphQLBoolean,
  } from 'graphql';
  import { contentType } from '@const/enumTypes';
  import { PageType } from '../types';
  import { Page, Workflow, Dashboard, Form } from '@models';
  import extendAbilityForPage from '@security/extendAbilityForPage';
  import { logger } from '@services/logger.service';
  
  /**
   *  Finds a page from its id and update it, if user is authorized.
   *    Update also the name and permissions of the linked content if it's not a form.
   *    Throws an error if not logged or authorized, or arguments are invalid.
   */
  export default {
    type: PageType,
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      visible: { type: GraphQLBoolean }
    },
    async resolve(parent, args, context) {
      try {
        // Authentication check
        const user = context.user;
        if (!user) {
          throw new GraphQLError(
            context.i18next.t('common.errors.userNotLogged')
          );
        }
        // check inputs
        if (!args)
          throw new GraphQLError(
            context.i18next.t('mutations.page.edit.visibility.errors')
          );
        // get data
        let page = await Page.findById(args.id);
        if (!page) {
          throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
        }
        // check permission
        const ability = await extendAbilityForPage(user, page);
        if (ability.cannot('update', page)) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
        page.visible = args.visible;
        await page.save();
        const update = {};
  
        // Object.assign(update, args.visible && { visible: args.visible });
  
        // apply the update
        // page = await Page.findByIdAndUpdate(
        //   page._id,
        //   { ...update },
        //   { new: true }
        // );
        console.log(page);
        return page;
      } catch (err) {
        logger.error(err.message, { stack: err.stack });
        if (err instanceof GraphQLError) {
          throw new GraphQLError(err.message);
        }
        throw new GraphQLError(
          context.i18next.t('common.errors.internalServerError')
        );
      }
    },
  };
  