import { GraphQLUpload } from 'apollo-server-core';
import {
  GraphQLError,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import { Form } from '@models';
import { uploadFile } from '@utils/files';
import i18next from 'i18next';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

/**
 * Upload File in Form.
 * todo: miss user text + check that user has access to form
 */
export default {
  type: GraphQLString,
  args: {
    file: { type: new GraphQLNonNull(GraphQLUpload) },
    form: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      const file = await args.file;
      const form = await Form.findById(args.form);
      if (!form) {
        throw new GraphQLHandlingError(i18next.t('common.errors.dataNotFound'));
      }
      const path = await uploadFile('forms', args.form, file.file);
      return path;
    } catch (err) {
      if (err instanceof GraphQLHandlingError) {
        throw new GraphQLError(err.message);
      }

      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
