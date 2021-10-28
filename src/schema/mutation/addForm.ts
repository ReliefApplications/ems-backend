import { GraphQLNonNull, GraphQLString, GraphQLBoolean, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { validateName } from '../../utils/validators';
import { Resource, Form } from '../../models';
import { buildTypes } from '../../utils/schema';
import { FormType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import permissions from '../../const/permissions';
import { status } from '../../const/enumTypes';

export default {
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
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = user.ability;
    validateName(args.name);
    if (args.newResource && args.resource) {
      throw new GraphQLError(errors.invalidAddFormArguments);
    }
    if (ability.cannot('create', 'Form')) {
      throw new GraphQLError(errors.permissionNotGranted);
    }
    const userGlobalRoles = user.roles.filter(role => !role.application).map(role => role._id);
    try {
      if (args.resource || args.newResource) {
        if (args.newResource) {
          const permissions = {
            canSee: [userGlobalRoles],
            canUpdate: [userGlobalRoles],
            canDelete: [userGlobalRoles],
          };
          const resource = new Resource({
            name: args.name,
            createdAt: new Date(),
            permissions,
          });
          await resource.save();
          Object.assign(permissions,
            { canSeeRecords: [] },
            { canCreateRecords: [] },
            { canUpdateRecords: [] },
            { canDeleteRecords: [] });
          const form = new Form({
            name: args.name,
            createdAt: new Date(),
            status: status.pending,
            resource,
            core: true,
            permissions,
          });
          await form.save();
          buildTypes();
          return form;
        } else {
          const resource = await Resource.findById(args.resource);
          const coreForm = await Form.findOne({ resource: args.resource, core: true });
          let fields = coreForm.fields;
          let structure = coreForm.structure;
          if (args.template) {
            const templateForm = await Form.findOne({ resource: args.resource, _id: args.template });
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
        const permissions = {
          canSee: [userGlobalRoles],
          canUpdate: [userGlobalRoles],
          canDelete: [userGlobalRoles],
          canSeeRecords: [],
          canCreateRecords: [],
          canUpdateRecords: [],
          canDeleteRecords: [],
        };
        const form = new Form({
          name: args.name,
          createdAt: new Date(),
          status: status.pending,
          permissions,
        });
        await form.save();
        buildTypes();
        return form;
      }
    } catch (error) {
      throw new GraphQLError(errors.resourceDuplicated);
    }
  },
};
