import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { transformRecord, getOwnership } from '@utils/form';
import { GraphQLID, GraphQLNonNull, GraphQLError } from 'graphql';
import { DraftRecordType } from '../types';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import GraphQLJSON from 'graphql-type-json';
import { DraftRecord, Form } from '@models';
import { Types } from 'mongoose';

/** Arguments for the addDraftRecord mutation */
type AddDraftRecordArgs = {
  form?: string | Types.ObjectId;
  data: any;
};

/**
 * Add a record to a form, if user authorized.
 * Throw a GraphQL error if not logged or authorized, or form not found.
 * TODO: we have to check form by form for that.
 */
export default {
  type: DraftRecordType,
  args: {
    form: { type: GraphQLID },
    data: { type: new GraphQLNonNull(GraphQLJSON) },
  },
  async resolve(parent, args: AddDraftRecordArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;

      // Get the form
      const form = await Form.findById(args.form);
      if (!form) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      // Check the ability with permissions for this form
      const ability = await extendAbilityForRecords(user, form);
      if (ability.cannot('create', 'Record')) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Create the record instance
      transformRecord(args.data, form.fields);
      const record = new DraftRecord({
        form: args.form,
        data: args.data,
        resource: form.resource ? form.resource : null,
        createdBy: {
          user: user._id.toString(),
          roles: user.roles.map((x) => x._id),
          positionAttributes: user.positionAttributes.map((x) => {
            return {
              value: x.value,
              category: x.category._id,
            };
          }),
        },
        lastUpdateForm: form.id,
        _createdBy: {
          user: {
            _id: context.user._id,
            name: context.user.name,
            username: context.user.username,
          },
        },
        _form: {
          _id: form._id,
          name: form.name,
        },
        _lastUpdateForm: {
          _id: form._id,
          name: form.name,
        },
      });
      // Update the createdBy property if we pass some owner data
      const ownership = getOwnership(form.fields, args.data);
      if (ownership) {
        record.createdBy = { ...record.createdBy, ...ownership };
      }
      await record.save();
      return record;
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
