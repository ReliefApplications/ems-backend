import { ApiConfiguration, Form } from '@models';
import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLID,
  GraphQLNonNull,
} from 'graphql';
import mongoose from 'mongoose';
import { Context } from '@server/apollo/context';
import { graphQLAuthCheck } from '@schema/shared';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { logger } from '@lib/logger';
import { KoboDataExtractor } from '@utils/form/kobo/KoboDataExtractor';

/** Arguments for the addRecordsFromKobo mutation */
type AddRecordsFromKoboArgs = {
  form: string | mongoose.Types.ObjectId;
};

/**
 * For a form created from a Kobo toolbox form, import data submissions to create records.
 * Throw an error if not logged or authorized, or if arguments are invalid.
 */
export default {
  type: GraphQLBoolean,
  args: {
    form: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: AddRecordsFromKoboArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // Get the form
      const form = await Form.findById(args.form).populate(
        'kobo.apiConfiguration'
      );
      if (!form || !form.kobo.id) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      // Check the ability with permissions for this form
      const ability = await extendAbilityForRecords(user, form);
      if (ability.cannot('create', 'Record')) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      // Get Kobo data submissions
      const apiConfiguration = await ApiConfiguration.findById(
        form.kobo.apiConfiguration
      );
      if (!apiConfiguration) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      const koboExtractor = new KoboDataExtractor(form).setUser(user);
      const { added, updated } = await koboExtractor.sync();
      return added + updated > 0;
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
