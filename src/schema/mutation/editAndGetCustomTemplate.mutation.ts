import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import GraphQLJSON from 'graphql-type-json';
import { CustomTemplateType } from '@schema/types/customTemplate.type';
import { CustomTemplate } from '@models/customTemplate.model';

/**
 * Mutation to update an existing custom notification.
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
        };

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
      }

      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
