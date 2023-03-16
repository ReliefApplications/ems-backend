import { Application, User } from '@models';
import { sendEmail } from '../email';
import config from 'config';

/**
 * Send a mail with the invitation link to the application
 *
 * @param recipients The list of recipients for the mail
 * @param sender The user who send the invitation
 * @param application The id of the application
 */
export const sendAppInvitation = async (
  recipients: string[],
  sender: User,
  application: Application
) => {
  const url = new URL(config.get('frontOffice.uri'));
  url.pathname = `/${application.id}`;
  await sendEmail({
    template: 'app-invitation',
    message: {
      to: recipients,
    },
    locals: {
      senderName: sender.name,
      appName: application.name,
      url,
    },
  });
};

/**
 * Send a mail with the invitation link to the application
 *
 * @param recipients The list of recipients for the mail
 * @param sender The user who send the invitation
 * @param application The id of the application
 */
export const sendCreateAccountInvitation = async (
  recipients: string[],
  sender: User,
  application: Application | null
) => {
  if (application) {
    const url = new URL(config.get('frontOffice.uri'));
    url.pathname = `/${application.id}`;
    await sendEmail({
      template: 'create-account-to-app',
      message: {
        to: recipients,
      },
      locals: {
        senderName: sender.name,
        appName: application.name,
        url,
        platformUrl: new URL(config.get('frontOffice.uri')),
      },
    });
  } else {
    await sendEmail({
      template: 'create-account',
      message: {
        to: recipients,
      },
      locals: {
        senderName: sender.name,
        url: new URL(config.get('backOffice.uri')),
      },
    });
  }
};
