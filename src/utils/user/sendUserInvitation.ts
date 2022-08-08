import { Application, User } from '../../models';
import { sendEmail } from '../email';
import * as dotenv from 'dotenv';
dotenv.config();

/** Uri for back-office */
const BACK_OFFICE_URI = process.env.BACK_OFFICE_URI;
/** Uri for front office */
const FRONT_OFFICE_URI = process.env.FRONT_OFFICE_URI;

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
  const url = new URL(FRONT_OFFICE_URI);
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
    const url = new URL(FRONT_OFFICE_URI);
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
        platformUrl: new URL(FRONT_OFFICE_URI),
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
        url: new URL(BACK_OFFICE_URI),
      },
    });
  }
};
