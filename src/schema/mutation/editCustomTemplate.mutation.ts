import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import GraphQLJSON from 'graphql-type-json';
import { CustomTemplateType } from '@schema/types/customTemplate.type';
import { CustomTemplate } from '@models/customTemplate.model';
import { blobStorageUpload } from '@utils/notification/blobStorage';

/**
 * Mutation to update an existing custom template.
 */
export default {
  type: CustomTemplateType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    customTemplate: { type: GraphQLJSON },
  },
  async resolve(_, args, context: Context) {
    try {
      graphQLAuthCheck(context);
      if (args.customTemplate) {
        const customTemplateData = {
          subject: args.customTemplate.subject,
          name: args.customTemplate.name,
          header: args.customTemplate.header,
          body: args.customTemplate.body,
          banner: args.customTemplate.banner,
          footer: args.customTemplate.footer,
          createdBy: { name: context.user.name, email: context.user.username },
          isDeleted: args.customTemplate.isDeleted,
          isFromEmailNotification:
            args?.customTemplate?.isFromEmailNotification || false,
          includeDetails: args.customTemplate.includeDetails || false,
        };

        if (args.customTemplate.header?.headerLogo) {
          const base64data = args.customTemplate.header.headerLogo;
          const fileName = await blobStorageUpload(
            base64data,
            'header',
            args.id.toString()
          );
          customTemplateData.header.headerLogo = fileName;
        }

        if (args.customTemplate.footer?.footerLogo) {
          const base64data = args.customTemplate.footer.footerLogo;
          const fileName = await blobStorageUpload(
            base64data,
            'footer',
            args.id.toString()
          );
          customTemplateData.footer.footerLogo = fileName;
        }

        if (args.customTemplate.banner?.bannerImage) {
          const base64data = args.customTemplate.banner.bannerImage;
          const fileName = await blobStorageUpload(
            base64data,
            'banner',
            args.id.toString()
          );
          customTemplateData.banner.bannerImage = fileName;
        }

        const updatedData = await CustomTemplate.findByIdAndUpdate(
          args.id,
          { $set: customTemplateData },
          { new: true } // Return the modified document
        );

        return updatedData;
      } else {
        const customTemplate = await CustomTemplate.findById(args.id);
        return customTemplate;
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });

      if (err instanceof GraphQLError) {
        throw err;
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
