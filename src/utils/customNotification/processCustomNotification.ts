import {
  customNotificationRecipientsType,
  customNotificationType,
} from '@const/enumTypes';
import {
  CustomNotification,
  Resource,
  Record,
  Application,
  User,
} from '@models';
import { get } from 'lodash';
import customNotificationSend from './customNotificationSend';
import { logger } from '@services/logger.service';
import { preprocess } from '@utils/email';

/**
 * Depending on  notification type,  for custom notification
 *
 * @param content template content
 * @param notificationType notification type
 * @param fields fields to process
 * @param rows data of records rows
 */
const processTemplateContent = async (
  content,
  notificationType,
  fields,
  rows
) => {
  if (notificationType === customNotificationType.email) {
    content.body = await preprocess(content.body, {
      fields,
      rows,
    });
    content.subject = await preprocess(content.subject, {
      fields,
      rows,
    });
  } else {
    content.title = await preprocess(content.title, {
      fields,
      rows,
    });
    content.description = await preprocess(content.description, {
      fields,
      rows,
    });
  }
  return content;
};

/**
 * Check if trigger has filters, if so return mongoose filter
 *
 * @param notification custom notification
 * @param application custom notification's application
 * @param resource resource object
 * @param records records object
 */
export default async (
  notification: CustomNotification,
  application: Application,
  resource?: Resource,
  records?: Record[]
) => {
  try {
    const template = application.templates.find(
      (x) => x._id.toString() === notification.template.toString()
    );

    const notificationType = get(notification, 'notificationType', 'email');

    let sent = false;
    let recipients: string[] = [];
    let userField = '';
    let emailField = '';
    switch (notification.recipientsType) {
      // Use single email as recipients
      case customNotificationRecipientsType.email: {
        recipients = [notification.recipients];
        break;
      }
      // Use distribution list as recipients
      case customNotificationRecipientsType.distributionList: {
        const distribution = application.distributionLists.find(
          (x) => x._id.toString() === notification.recipients
        );
        recipients = get(distribution, 'emails', []);
        break;
      }
      // Use dataset user question field as recipients
      case customNotificationRecipientsType.userField: {
        userField = notification.recipients;
        break;
      }
      // Use dataset email question field as recipients
      case customNotificationRecipientsType.emailField: {
        emailField = notification.recipients;
        break;
      }
      // Use channel as recipients
      case customNotificationRecipientsType.channel: {
        recipients = [notification.recipients];
        break;
      }
    }

    if (resource) {
      const layout = resource.layouts.find(
        (x) => x._id.toString() === notification.layout.toString()
      );

      const fieldArr = [];
      for (const field of resource.fields) {
        const layoutField = layout.query.fields.find(
          (fieldDetail) => fieldDetail.name == field.name
        );

        if (field.type != 'users') {
          const obj = {
            name: field.name,
            field: field.name,
            type: field.type,
            meta: {
              field: field,
            },
            title: layoutField?.label || layoutField?.name,
          };
          fieldArr.push(obj);
        }
      }

      if (records.length) {
        const redirectToRecords =
          notification.redirect &&
          notification.redirect.active &&
          notification.redirect.type === 'recordIds';
        const recordsIds = [];
        const recordListArr = [];
        for (const record of records) {
          if (record.data) {
            Object.keys(record.data).forEach(function (key) {
              record.data[key] =
                typeof record.data[key] == 'object'
                  ? record.data[key]?.join(',')
                  : record.data[key];
            });
            recordListArr.push({ ...record.data, id: record._id });
            if (redirectToRecords) {
              recordsIds.push(record._id);
            }
          }
        }

        if (!!userField || !!emailField) {
          const field = userField || emailField;
          const groupRecordArr = [];
          const groupValArr = [];
          for (const record of recordListArr) {
            const index = groupValArr.indexOf(record[field]);
            if (index == -1) {
              groupValArr.push(record[field]);
              delete record[field];
              groupRecordArr.push([record]);
            } else {
              delete record[field];
              groupRecordArr[index].push(record);
            }
          }

          let d = 0;
          for await (const groupRecord of groupRecordArr) {
            if (groupRecord.length > 0) {
              template.content = await processTemplateContent(
                template.content,
                notificationType,
                fieldArr,
                groupRecord
              );
            }
            if (!!userField) {
              // If using userField, get the user with the id saved in the record data
              const userDetail = await User.findById(groupValArr[d]);
              if (!!userDetail && !!userDetail.username) {
                if (notificationType === customNotificationType.email) {
                  // If email type, should get user email
                  recipients = [userDetail.username];
                  await customNotificationSend(
                    template,
                    recipients,
                    notification
                  );
                  sent = true;
                } else {
                  // If notification type, should get user id
                  recipients = userDetail.id;
                  await customNotificationSend(
                    template,
                    recipients,
                    notification,
                    recordsIds
                  );
                  sent = true;
                }
              }
            } else {
              // If using emailField, get the email saved in the record data
              recipients = groupValArr[d];
              await customNotificationSend(template, recipients, notification);
              sent = true;
            }
            d++;
          }
        } else {
          template.content = await processTemplateContent(
            template.content,
            notificationType,
            fieldArr,
            recordListArr
          );
          await customNotificationSend(
            template,
            recipients,
            notification,
            recordsIds
          );
          sent = true;
        }
      }
    } else {
      await customNotificationSend(template, recipients, notification);
      sent = true;
    }

    if (sent) {
      const update = {
        $set: {
          'customNotifications.$.lastExecutionStatus': 'success',
          'customNotifications.$.lastExecution': new Date(),
        },
      };
      await Application.findOneAndUpdate(
        {
          _id: application._id,
          'customNotifications._id': notification._id,
        },
        update
      );
    }
  } catch (error) {
    logger.error(error.message, { stack: error.stack });
  }
};
