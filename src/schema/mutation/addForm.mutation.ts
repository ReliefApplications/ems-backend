import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLError,
} from 'graphql';
import { validateGraphQLTypeName } from '@utils/validators';
import { Resource, Form, Role, ReferenceData } from '@models';
import { FormType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { status } from '@const/enumTypes';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the addForm mutation */
type AddFormArgs = {
  name: string;
  resource?: string | Types.ObjectId;
  template?: string | Types.ObjectId;
};

/**
 * Create a new form
 * Throw an error if: user not logged or authorized, form is duplicated or arguments are invalid.
 */
export default {
  type: FormType,
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    resource: { type: GraphQLID },
    template: { type: GraphQLID },
  },
  async resolve(parent, args: AddFormArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      // Check authentication
      const user = context.user;
      const ability: AppAbility = user.ability;
      // Check permission to create form
      if (ability.cannot('create', 'Form')) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      // Check if another form with same name exists
      const graphQLTypeName = Form.getGraphQLTypeName(args.name);
      validateGraphQLTypeName(graphQLTypeName, context.i18next);
      if (
        (await Form.hasDuplicate(graphQLTypeName)) ||
        (await ReferenceData.hasDuplicate(graphQLTypeName))
      ) {
        throw new GraphQLError(
          context.i18next.t('common.errors.duplicatedGraphQLTypeName')
        );
      }
      // define default permission lists
      const userGlobalRoles =
        user.roles
          .filter((role: Role) => !role.application)
          .map((role: Role) => role._id) || [];
      const defaultFormPermissions = {
        canSee: userGlobalRoles,
        canUpdate: userGlobalRoles,
        canDelete: userGlobalRoles,
      };
      const defaultResourcePermissions = {
        ...defaultFormPermissions,
        canSeeRecords: userGlobalRoles.map((x) => {
          return {
            role: x,
          };
        }),
        canCreateRecords: userGlobalRoles.map((x) => {
          return {
            role: x,
          };
        }),
        canUpdateRecords: userGlobalRoles.map((x) => {
          return {
            role: x,
          };
        }),
        canDeleteRecords: userGlobalRoles.map((x) => {
          return {
            role: x,
          };
        }),
        canDownloadRecords: userGlobalRoles.map((x) => {
          return {
            role: x,
          };
        }),
      };
      try {
        if (!args.resource) {
          // Check permission to create resource
          if (ability.cannot('create', 'Resource')) {
            throw new GraphQLError(
              context.i18next.t('common.errors.permissionNotGranted')
            );
          }
          // create resource
          const resource = new Resource({
            name: args.name,
            //createdAt: new Date(),
            permissions: defaultResourcePermissions,
          });
          await resource.save();
          // create form
          const form = new Form({
            name: args.name,
            graphQLTypeName,
            status: status.pending,
            resource,
            core: true,
            permissions: defaultFormPermissions,
          });
          await form.save();
          return form;
        } else {
          // fetch the resource and the core form
          const resource = await Resource.findById(args.resource);
          const coreForm = await Form.findOne({
            resource: args.resource,
            core: true,
          });
          // create the form following the template or the core form
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
            graphQLTypeName,
            status: status.pending,
            resource,
            structure,
            fields,
            permissions: defaultFormPermissions,
          });
          await form.save();
          return form;
        }
      } catch (error) {
        throw new GraphQLError(
          context.i18next.t('mutations.form.add.errors.resourceDuplicated')
        );
      }
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
