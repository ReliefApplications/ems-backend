import { ObjectId } from 'mongoose';
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
 * @param userEmails The list of recipients for the mail
 * @param sender The user who send the invitation
 * @param applicationId The id of the application
 */
export const sendAppInvitation = async (
  userEmails: string[],
  sender: User,
  applicationId: ObjectId
) => {
  const application = await Application.findById(applicationId);
  const url = new URL(FRONT_OFFICE_URI);
  url.pathname = `/${application.id}`;
  await sendEmail({
    template: 'app-invitation',
    message: {
      to: userEmails,
    },
    locals: {
      username: sender.name,
      appName: application.name,
      url,
    },
  });
};
