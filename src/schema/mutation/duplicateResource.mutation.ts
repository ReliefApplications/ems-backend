import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ResourceType } from '../types';
import { Resource } from '@models';
import { Form } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';

/** Maps field related names when duplicating */
const nameMap = new Map<string, string>();

/**
 * When duplicating a form, we need to make sure we keep the related names unique.
 *
 * @param doc Duplicated form or resource.
 */
export const handleRelatedNames = (doc: Form | Resource) => {
  doc.fields.forEach((f) => {
    // Only change resource/resources fields
    if (!['resource', 'resources'].includes(f.type)) {
      return;
    }

    // Add a random string at the end of the name to make it unique
    const randomString = Math.random().toString(36).substring(7);
    // Like this, we keep the same new name between forms and resource models
    if (!nameMap.has(f.relatedName)) {
      nameMap.set(f.relatedName, `${f.relatedName}_${randomString}`);
    }
    f.relatedName = nameMap.get(f.relatedName);
  });

  doc.markModified('fields');

  // If it's a form, we also need to update the structure
  if (doc instanceof Form) {
    // We replace matches of "relatedName":"[oldName]" by "relatedName":"[newName]"
    // so we don't need to parse the structure
    nameMap.forEach((newName, oldName) => {
      doc.structure = doc.structure.replace(
        `"relatedName":"${oldName}"`,
        `"relatedName":"${newName}"`
      );

      doc.structure = doc.structure.replace(
        `"relatedName": "${oldName}"`,
        `"relatedName": "${newName}"`
      );
    });

    doc.markModified('structure');
  }
};

/**
 * Duplicates a resource from a given id.
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

      const originalResource = await Resource.findOne(filters);
      if (!originalResource) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Get all resources names and check if the name of the duplicated resource is already used
      // If it is, add a number at the end of the name to make it unique.
      const existingNames = await Resource.find({
        name: { $regex: `^${originalResource.name}` },
      });
      let newName = originalResource.name;
      let count = 1;
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      while (existingNames.find((r) => r.name === newName)) {
        newName = `${originalResource.name} (${count++})`;
      }

      // Duplicate resource with new id
      const duplicatedResource = new Resource({
        name: newName,
        permissions: [],
        fields: originalResource.fields,
        layouts: originalResource.layouts,
        aggregations: originalResource.aggregations,
      });

      // Handle related names
      handleRelatedNames(duplicatedResource);

      // Save the duplicated resource
      await duplicatedResource.save();

      // Resource is not duplicated, user does not have permission to do the create resource
      if (!duplicatedResource) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Get all forms with the resource id
      const forms = await Form.find({ resource: originalResource._id });

      // Get forms that start with the same name of each form
      const existingForms = await Form.find({
        name: {
          $regex: `^${forms.map((f) => f.name).join('|')}`,
        },
      });

      // Duplicate forms with new resource id
      for (const form of forms) {
        // Add the number at the end of the name to make it unique
        let newNameForm = form.name;
        let formNumber = 1;
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        while (existingForms.find((r) => r.name === newNameForm)) {
          newNameForm = `${form.name} (${formNumber++})`;
        }

        const duplicatedForm = new Form({
          name: newNameForm,
          graphQLTypeName: Form.getGraphQLTypeName(newNameForm),
          core: form.core,
          status: 'pending',
          permissions: [],
          resource: duplicatedResource._id,
          fields: form.fields,
          layouts: form.layouts,
          structure: form.structure,
          createdAt: new Date(),
        });
        duplicatedForm.channel.push(duplicatedForm._id);

        // Handle related names
        handleRelatedNames(duplicatedForm);

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
