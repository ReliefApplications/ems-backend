import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ResourceType } from '../types';
import { Resource } from '@models';
import { Form } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';

/**
 * Delete a resource from its id.
 * Throw GraphQL error if not logged or authorized.
 */
export default {
  type: ResourceType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const ability: AppAbility = user.ability;
      const filters = Resource.find(accessibleBy(ability, 'create').Resource)
        .where({ _id: args.id })
        .getFilter();

      const findedResource = await Resource.findOne(filters);

      // Get all resources names and check if the name of the duplicated resource is already used
      // If it is, add a number at the end of the name to make it unique.
      const existingNames = await Resource.find().distinct('name');
      let newName = findedResource.name;
      let count = 1;
      while (existingNames.includes(newName)) {
        newName = `${findedResource.name}(${count++})`;
      }

      // Duplicate resource with new id
      const duplicatedResource = await Resource.create({
        name: newName,
        permissions: findedResource.permissions,
        fields: findedResource.fields,
        layouts: findedResource.layouts,
        aggregations: findedResource.aggregations,
      });

      // Resource is not duplicated, user does not have permission to do the create resource
      if (!duplicatedResource) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Get all forms with the resource id
      const forms = await Form.find({ resource: findedResource._id });

      // Duplicate forms with new resource id
      for (const form of forms) {
        const duplicatedForm = new Form({
          name: newName,
          graphQLTypeName: newName,
          core: form.core,
          status: form.status,
          permissions: form.permissions,
          resource: duplicatedResource._id,
          channel: [],
          fields: form.fields,
          layouts: form.layouts,
          structure: form.structure,
          createdAt: new Date(),
        });
        duplicatedForm.channel.push(duplicatedForm._id);

        await Form.create(duplicatedForm);

        // Form is not duplicated, user does not have permission to do the create form
        if (!duplicatedForm) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
      }

      return duplicatedResource;
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
