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
  send: true, // force sending mails in dev mode (disable by default)
  views: { root: 'src/emails' },
  juice: true,
  juiceResources: {
    preserveImportant: true,
    webResources: {
      // Indicates where is the style.css file
      relativeTo: path.resolve('src/emails/'),
    },
  },
});

/** Address type for nodemailer */
type Address = string | { name: string; address: string };

/**
 * Send an email from Oort. It's only a wrapper of the Email.send function,
 * to manage more than 50 recipients.
 *
 * @param params - The params to use with email.send()
 * @param params.template - The html template to generate the subject and the body (optional)
 * @param params.locals - The variables to pass into the template (optional)
 * @param params.message - The message object which will be passed to nodemailer
 * @param params.message.to - The recipients of the message
 * @param params.message.subject - The subject of the message (optional if template is given)
 * @param params.message.html - The body of the message (optional if template is given)
 * @param params.message.attachments - The list of attachments (optional)
 */
export const sendEmail = async (params: {
  template?: string;
  locals?: any;
  message: {
    to: Address[];
    subject?: string;
    html?: string;
    attachments?: any[];
  };
}) => {
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
  // Send the mail to each chunk
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
