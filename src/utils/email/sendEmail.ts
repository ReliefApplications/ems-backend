import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import Email from 'email-templates';
import path from 'path';

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

/** Reusable email definition */
const email = new Email({
  transport: nodemailer.createTransport(TRANSPORT_OPTIONS),
  message: {
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
  },
  send: true,
  views: { root: 'src/emails' },
  juice: true,
  juiceResources: {
    preserveImportant: true,
    webResources: {
      // view folder path, it will get css from `mars/style.css`
      relativeTo: path.resolve('src/emails/'),
    },
  },
});

/** Address type for nodemailer */
type Address = string | { name: string; address: string };

/** Email type for nodemailer */
export interface EmailParams {
  template?: string;
  locals?: any;
  message: {
    to: Address[];
    subject?: string;
    html?: string;
    attachments?: any[];
  };
}

/**
 * Send an email from Oort. It's only a wrapper of the Email.send function,
 * to manage more than 50 recipients.
 *
 * @param params The params to use with email.send()
 */
export const sendEmail = async (params: EmailParams) => {
  // Split the email in multiple emails with 50 recipients max per email
  const recipients = params.message.to;
  const recipientsChunks: Address[][] = [];
  for (let i = 0; i < recipients.length; i += MAX_RECIPIENTS) {
    const list = recipients.slice(
      i,
      Math.min(i + MAX_RECIPIENTS, recipients.length)
    );
    recipientsChunks.push(list);
  }

  // Send mails to each chunk
  for (const chunk of recipientsChunks) {
    params.message.to = chunk;
    const info = await email.send(params);
    if (!info.messageId) {
      throw new Error('Unexpected email sending response');
    }
  }
};

/** The mail of the sender */
export const senderAddress = EMAIL_FROM;
