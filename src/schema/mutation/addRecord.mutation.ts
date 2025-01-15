import { GraphQLID, GraphQLNonNull, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { RecordType } from '../types';
import { Form, Record, Notification, Channel } from '@models';
import { transformRecord, getOwnership, getNextId } from '@utils/form';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import pubsub from '../../server/pubsub';
import { getFormPermissionFilter } from '@utils/filter';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { logEvent } from '@utils/events/logEvent';
import { EventType } from '@utils/events/event.model';

/** Arguments for the addRecord mutation */
type AddRecordArgs = {
  id?: string | Types.ObjectId;
  form?: string | Types.ObjectId;
  data: any;
};

/**
 * Add a record to a form, if user authorized.
 * Throw a GraphQL error if not logged or authorized, or form not found.
 * TODO: we have to check form by form for that.
 */
export default {
  type: RecordType,
  args: {
    id: { type: GraphQLID },
    form: { type: GraphQLID },
    data: { type: new GraphQLNonNull(GraphQLJSON) },
  },
  async resolve(parent, args: AddRecordArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;

      // Get the form
      const form = await Form.findById(
        args.form,
        'name fields permissions resource'
      );
      if (!form)
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));

      // Check the ability with permissions for this form
      const ability = await extendAbilityForRecords(user, form);
      if (ability.cannot('create', 'Record')) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Check unicity of record
      if (
        form.permissions.recordsUnicity &&
        form.permissions.recordsUnicity.length > 0 &&
        form.permissions.recordsUnicity[0].role
      ) {
        const unicityFilters = getFormPermissionFilter(
          user,
          form,
          'recordsUnicity'
        );
        if (unicityFilters.length > 0) {
          const uniqueRecordAlreadyExists = await Record.exists({
            $and: [
              { form: form._id, archived: { $ne: true } },
              { $or: unicityFilters },
            ],
          });
          if (uniqueRecordAlreadyExists) {
            throw new GraphQLError(
              context.i18next.t('common.errors.permissionNotGranted')
            );
          }
        }
      }
      // Create the record instance
      transformRecord(args.data, form.fields);

      // If an id is supplied, we check if another record with the same id exists
      if (args.id) {
        const existingRecord = await Record.findById(args.id);
        if (existingRecord) {
          throw new GraphQLError(
            context.i18next.t('mutations.record.add.recordAlreadyExists')
          );
        }
      }

      const { incrementalId, incID } = await getNextId(
        String(form.resource ? form.resource : args.form)
      );

      const record = new Record(
        Object.assign(
          {
            incrementalId,
            incID,
            form: args.form,
            //createdAt: new Date(),
            //modifiedAt: new Date(),
            data: args.data,
            resource: form.resource ? form.resource : null,
            createdBy: {
              user: user._id,
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
          },
          args.id ? { _id: new Types.ObjectId(args.id) } : {}
        )
      );
      // Update the createdBy property if we pass some owner data
      const ownership = getOwnership(form.fields, args.data);
      if (ownership) {
        record.createdBy = { ...record.createdBy, ...ownership };
      }
      // send notifications to channel
      const channel = await Channel.findOne({ form: form._id });
      if (channel) {
        const notification = new Notification({
          action: `New record - ${form.name}`,
          content: record,
          //createdAt: new Date(),
          channel: channel.id,
          seenBy: [],
        });
        await notification.save();
        const publisher = await pubsub();
        publisher.publish(channel.id, { notification });
      }
      await record.save();
      logEvent({
        type: EventType.ADD_RECORD,
        user: user._id.toString(),
        datetime: new Date(),
        record: record.incrementalId,
        form: form.name,
      });
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
