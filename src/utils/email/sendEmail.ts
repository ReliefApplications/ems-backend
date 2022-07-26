import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

/** Sender e-mail address prefix */
const EMAIL_FROM_PREFIX = process.env.MAIL_FROM_PREFIX || 'No reply';

/** Sender e-mail */
const EMAIL_FROM = `${EMAIL_FROM_PREFIX} <${process.env.MAIL_FROM}>`;

/** Reply to e-mail */
const EMAIL_REPLY_TO = process.env.MAIL_REPLY_TO || process.env.MAIL_FROM;

/** Maximum number of destinataries */
const MAX_RECIPIENTS = 50;

/** Nodemailer transport options */
const TRANSPORT_OPTIONS = {
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  requireTLS: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
};

/** Address type for nodemailer */
type Address = string | { name: string; address: string };

/** Email type for nodemailer */
export interface Email {
  recipient: Address[];
  subject: string;
  body: string;
  attachments?: any[];
}

/**
 * Send an email from Oort
 *
 * @param email The email object to send
 */
export const sendEmail = async (email: Email) => {
  // Split the email in multiple emails with 50 recipients max per email
  const recipientsChunks: Address[][] = [];
  for (let i = 0; i < email.recipient.length; i += MAX_RECIPIENTS) {
    const recipients = email.recipient.slice(
      i,
      Math.min(i + MAX_RECIPIENTS, email.recipient.length)
    );
    recipientsChunks.push(recipients);
  }

  // Create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport(TRANSPORT_OPTIONS);

  // Send mails
  for (const chunk of recipientsChunks) {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: chunk,
      subject: email.subject,
      html: email.body,
      attachments: email.attachments,
      replyTo: EMAIL_REPLY_TO,
    });
    if (!info.messageId) {
      throw new Error('Unexpected email sending response');
    }
  }
};

/** The mail of the sender */
export const senderAddress = EMAIL_FROM;
