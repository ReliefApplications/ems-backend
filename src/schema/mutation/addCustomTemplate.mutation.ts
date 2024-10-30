import { GraphQLError, GraphQLNonNull } from 'graphql';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import GraphQLJSON from 'graphql-type-json';
import { CustomTemplate } from '@models/customTemplate.model';
import { CustomTemplateType } from '@schema/types/customTemplate.type';
import { blobStorageUpload } from '@utils/notification/blobStorage';
import { ObjectId } from 'bson';

/**
 * Mutation to add a new custom template list.
 */
export default {
  type: CustomTemplateType,
  args: {
    customTemplate: { type: new GraphQLNonNull(GraphQLJSON) },
  },
  async resolve(_, args, context: Context) {
    graphQLAuthCheck(context);
    try {
      const customTemplateData = {
        _id: new ObjectId(),
        applicationId: args.customTemplate.applicationId,
        name: args.customTemplate.name,
        subject: args.customTemplate.subject,
        header: args.customTemplate.header,
        body: args.customTemplate.body,
        banner: args.customTemplate.banner,
        footer: args.customTemplate.footer,
        createdBy: { name: context.user.name, email: context.user.username },
        isFromEmailNotification:
          args.customTemplate.isFromEmailNotification || false,
        navigateToPage: args.customTemplate.navigateToPage || false,
        navigateSettings: args.customTemplate?.navigateSettings,
      };

      if (args.customTemplate.header?.headerLogo) {
        const base64data = args.customTemplate.header.headerLogo;
        const fileName = await blobStorageUpload(
          base64data,
          'header',
          customTemplateData._id.toString()
        );
        customTemplateData.header.headerLogo = fileName;
      }

      if (args.customTemplate.footer?.footerLogo) {
        const base64data = args.customTemplate.footer.footerLogo;
        const fileName = await blobStorageUpload(
          base64data,
          'footer',
          customTemplateData._id.toString()
        );
        customTemplateData.footer.footerLogo = fileName;
      }

      if (args.customTemplate.banner?.bannerImage) {
        const base64data = args.customTemplate.banner.bannerImage;
        const fileName = await blobStorageUpload(
          base64data,
          'banner',
          customTemplateData._id.toString()
        );
        customTemplateData.banner.bannerImage = fileName;
      }

      const customTemplate = new CustomTemplate(customTemplateData);
      await customTemplate.save();
      return customTemplate;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      } else if (err?.code === 11000) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.customTemplate.errors.customTemplateNameExist'
          )
        );
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
