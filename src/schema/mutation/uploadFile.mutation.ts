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

/**
 * Uploadg File.
 */
export default {
  type: GraphQLString,
  args: {
    file: { type: new GraphQLNonNull(GraphQLUpload) },
    form: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args) {
    const file = await args.file;
    const form = await Form.findById(args.form);
    if (!form) {
      throw new GraphQLError(i18next.t('common.errors.dataNotFound'));
    }
    const path = await uploadFile(file.file, args.form);
    return path;
  },
};
