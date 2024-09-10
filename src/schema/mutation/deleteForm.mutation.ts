import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { FormType } from '../types';
import { Form, Resource } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { unscheduleKoboSync } from '@server/koboSyncScheduler';

/** Arguments for the deleteForm mutation */
type DeleteFormArgs = {
  id: string | Types.ObjectId;
};

/**
 * Find form from its id and delete it, and all records associated, if user is authorized.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: FormType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: DeleteFormArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // Get ability
      const ability: AppAbility = user.ability;

      // Get the form
      const filters = Form.find(accessibleBy(ability, 'delete').Form)
        .where({ _id: args.id })
        .getFilter();
      const form = await Form.findOne(filters);
      if (!form) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      // if is core form we have to delete the linked forms and resource
      if (form.core) {
        // delete the resource and all forms associated
        await Resource.deleteOne({ _id: form.resource });
      } else {
        await form.deleteOne();
      }
      // If form was created from Kobo, check if should delete a scheduled synchronization
      if (form.kobo.id) {
        unscheduleKoboSync(form);
      }
      return form;
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
