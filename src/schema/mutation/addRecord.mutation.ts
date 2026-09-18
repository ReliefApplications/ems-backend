import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { RecordType } from '../types';
import { Form, Record, Notification, Channel, Version } from '@models';
import { transformRecord, getOwnership, getNextId } from '@utils/form';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import pubsub from '../../server/pubsub';
import { getFormPermissionFilter } from '@utils/filter';
import { logger } from '@services/logger.service';
import { verifyTurnstileToken } from '@utils/captcha';
import { isObjectIdOrHexString, Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { getErrorMessage, getErrorStack } from '@utils/error';

/** Arguments for the addRecord mutation */
export type AddRecordArgs = {
  form?: string | Types.ObjectId;
  data: any;
  captchaToken?: string;
  cloneRecordId?: string | Types.ObjectId;
};

/**
 * Add a record to a form, if user authorized.
 * Unauthenticated users can add records to public forms, provided they pass
 * a valid Cloudflare Turnstile captcha token. In that case, the ability check
 * is skipped.
 * If a record to clone is provided, the new record reuses its history.
 * Throw a GraphQL error if not logged or authorized, or form not found.
 * TODO: we have to check form by form for that.
 */
export default {
  type: RecordType,
  args: {
    form: { type: GraphQLID },
    data: { type: new GraphQLNonNull(GraphQLJSON) },
    captchaToken: { type: GraphQLString },
    cloneRecordId: { type: GraphQLID },
  },
  async resolve(parent, args: AddRecordArgs, context: Context) {
    try {
      const user = context.user;

      // Get the form
      const form = await Form.findById(args.form);
      if (!form)
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));

      if (user) {
        // Check the ability with permissions for this form
        const ability = await extendAbilityForRecords(user, form);
        if (ability.cannot('create', 'Record')) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
      } else {
        // Unauthenticated users can only add records to public forms
        if (!form.isPublic) {
          throw new GraphQLError(
            context.i18next.t('common.errors.userNotLogged')
          );
        }
        // Captcha verification replaces the ability check
        if (
          !args.captchaToken ||
          !(await verifyTurnstileToken(args.captchaToken))
        ) {
          throw new GraphQLError(
            context.i18next.t('common.errors.invalidCaptcha')
          );
        }
      }

      // Check unicity of record
      if (
        user &&
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

      // If a record to clone is provided, the new record reuses its history
      let versions: Types.ObjectId[] = [];
      let clonedDataVersion: Version;
      if (args.cloneRecordId) {
        // Cloning is not part of the public form flow
        if (!user) {
          throw new GraphQLError(
            context.i18next.t('common.errors.userNotLogged')
          );
        }
        if (!isObjectIdOrHexString(args.cloneRecordId)) {
          throw new GraphQLError(
            context.i18next.t(
              'mutations.record.add.errors.invalidCloneRecordId'
            )
          );
        }
        const clonedRecord = await Record.findById(args.cloneRecordId);
        // The cloned record must belong to the same resource, or, for forms
        // without a resource, to the same form
        const sameFamily = form.resource
          ? form.resource.equals(clonedRecord?.resource)
          : form._id.equals(clonedRecord?.form);
        if (!clonedRecord || !sameFamily) {
          throw new GraphQLError(
            context.i18next.t(
              'mutations.record.add.errors.invalidCloneRecordResource'
            )
          );
        }
        // Check that the user can see the record they clone the history from
        const clonedForm = form._id.equals(clonedRecord.form)
          ? form
          : await Form.findById(clonedRecord.form);
        const clonedRecordAbility = await extendAbilityForRecords(
          user,
          clonedForm
        );
        if (clonedRecordAbility.cannot('read', clonedRecord)) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
        // Versions are not duplicated: both records reference the same ones.
        // The current data of the cloned record is stored as a new version, so
        // the history of the new record displays what changed since then
        clonedDataVersion = new Version({
          data: clonedRecord.data,
          createdAt: clonedRecord.modifiedAt
            ? clonedRecord.modifiedAt
            : clonedRecord.createdAt,
          createdBy: user._id,
        });
        versions = [...(clonedRecord.versions || []), clonedDataVersion._id];
      }

      // Create the record instance
      transformRecord(args.data, form.fields);
      const record = new Record({
        incrementalId: await getNextId(
          String(form.resource ? form.resource : args.form)
        ),
        form: args.form,
        //createdAt: new Date(),
        //modifiedAt: new Date(),
        data: args.data,
        resource: form.resource ? form.resource : null,
        versions,
        ...(user && {
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
          _createdBy: {
            user: {
              _id: user._id,
              name: user.name,
              username: user.username,
            },
          },
        }),
        lastUpdateForm: form.id,
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
      // Only store the new version once the record is saved
      if (clonedDataVersion) {
        await clonedDataVersion.save();
      }
      return record;
    } catch (err) {
      logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
