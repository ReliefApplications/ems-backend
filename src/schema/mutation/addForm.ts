import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLID,
  GraphQLError,
} from 'graphql';
import { validateName } from '../../utils/validators';
import { Resource, Form } from '../../models';
import { buildTypes } from '../../utils/schema';
import { FormType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import permissions from '../../const/permissions';
import { status } from '../../const/enumTypes';

export default {
  /**
   * Create a new form
   *    Throw an error if: user not logged or authorized, form is duplicated or arguments are invalid.
   */
  type: FormType,
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    newResource: { type: GraphQLBoolean },
    resource: { type: GraphQLID },
    template: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    validateName(args.name);
    const sameNameFormRes = await Form.findOne({ name: args.name });
    if (sameNameFormRes) {
      throw new GraphQLError(context.i18next.t('errors.formResDuplicated'));
    }
    if (args.newResource && args.resource) {
      throw new GraphQLError(context.i18next.t('errors.invalidAddFormArguments'));
    }
    if (ability.cannot('create', 'Form')) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
    const userGlobalRoles =
      user.roles.filter((role) => !role.application).map((role) => role._id) ||
      [];
    try {
      if (args.resource || args.newResource) {
        if (args.newResource) {
          const newPermissions = {
            canSee: userGlobalRoles,
            canUpdate: userGlobalRoles,
            canDelete: userGlobalRoles,
          };
          const resource = new Resource({
            name: args.name,
            createdAt: new Date(),
            permissions: newPermissions,
          });
          await resource.save();
          Object.assign(
            newPermissions,
            { canSeeRecords: [] },
            { canCreateRecords: [] },
            { canUpdateRecords: [] },
            { canDeleteRecords: [] }
          );
          const form = new Form({
            name: args.name,
            createdAt: new Date(),
            status: status.pending,
            resource,
            core: true,
            permissions: newPermissions,
          });
          await form.save();
          buildTypes();
          return form;
        } else {
          const resource = await Resource.findById(args.resource);
          const coreForm = await Form.findOne({
            resource: args.resource,
            core: true,
          });
          let fields = coreForm.fields;
          let structure = coreForm.structure;
          if (args.template) {
            const templateForm = await Form.findOne({
              resource: args.resource,
              _id: args.template,
            });
            if (templateForm) structure = templateForm.structure;
            if (templateForm.fields.length > 0) fields = templateForm.fields;
          }
          const form = new Form({
            name: args.name,
            createdAt: new Date(),
            status: status.pending,
            resource,
            structure,
            fields,
            permissions,
          });
          await form.save();
          buildTypes();
          return form;
        }
      } else {
        const newPermissions = {
          canSee: userGlobalRoles,
          canUpdate: userGlobalRoles,
          canDelete: userGlobalRoles,
          canSeeRecords: [],
          canCreateRecords: [],
          canUpdateRecords: [],
          canDeleteRecords: [],
        };
        const form = new Form({
          name: args.name,
          createdAt: new Date(),
          status: status.pending,
          permissions: newPermissions,
        });
        await form.save();
        buildTypes();
        return form;
      }
    } catch (error) {
      throw new GraphQLError(context.i18next.t('errors.resourceDuplicated'));
    }
  },
};
