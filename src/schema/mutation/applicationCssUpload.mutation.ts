import { GraphQLUpload } from 'apollo-server-core';
import {
  GraphQLError,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import { Application } from '@models';
import { uploadFile } from '@utils/files';
import i18next from 'i18next';

/**
 * Uploadg File.
 */
export default {
  type: GraphQLString,
  args: {
    file: { type: new GraphQLNonNull(GraphQLUpload) },
    application: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args) {
    const file = await args.file;
    const application = await Application.findById(args.application);
    if (!application) {
      throw new GraphQLError(i18next.t('common.errors.dataNotFound'));
    }
    const path = await uploadFile(file.file, args.application, 'applications');

    await Application.updateOne(
      { _id: args.application },
      { cssFilename: path }
    );

    return path;
  },
};
