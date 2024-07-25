import { GraphQLError, GraphQLNonNull } from 'graphql';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import GraphQLJSON from 'graphql-type-json';
import { CustomTemplate } from '@models/customTemplate.model';
import { CustomTemplateType } from '@schema/types/customTemplate.type';

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
        applicationId: args.customTemplate.applicationId,
        subject: args.customTemplate.subject,
        header: args.customTemplate.header,
        body: args.customTemplate.body,
        banner: args.customTemplate.banner,
        footer: args.customTemplate.footer,
        createdBy: { name: context.user.name, email: context.user.username },
      };

      console.log(customTemplateData);

      const customTemplate = new CustomTemplate(customTemplateData);
      await customTemplate.save();
      return customTemplate;
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
