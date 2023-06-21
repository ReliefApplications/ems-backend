// import { GraphQLUpload } from 'apollo-server-core';
// import { GraphQLUpload } from 'graphql-server-express-upload';
import { GraphQLUpload } from 'graphql-upload-ts';

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

/**
 * Upload File in Form.
 * todo: miss user text + check that user has access to form
 */
export default {
  type: GraphQLString,
  args: {
    file: { type: GraphQLUpload },
    form: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      const file = await args.file;
      const form = await Form.findById(args.form);
      if (!form) {
        throw new GraphQLError(i18next.t('common.errors.dataNotFound'));
      }
      const path = await uploadFile('forms', args.form, file.file);
      return path;
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
