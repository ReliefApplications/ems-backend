import * as nodemailer from 'nodemailer';
import Email from 'email-templates';
import path from 'path';
import config from 'config';

/** Sender e-mail */
const EMAIL_FROM = `${config.get('email.fromPrefix')} <${config.get(
  'email.from'
)}>`;

/** Reply to e-mail */
const EMAIL_REPLY_TO = config.get('email.replyTo') || config.get('email.from');

/** Maximum number of recipients*/
const MAX_RECIPIENTS: number = config.get('email.maxRecipients');

/** Nodemailer transport options */
const TRANSPORT_OPTIONS = {
  host: config.get('email.host'),
  port: config.get('email.port'),
  requireTLS: true,
  auth: {
    user: config.get('email.user'),
    pass: config.get('email.pass'),
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
  views: { root: 'src/assets/emails' },
  juice: true,
  juiceResources: {
    preserveImportant: true,
    webResources: {
      // Indicates where is the style.css file
      relativeTo: path.resolve('src/assets/emails/'),
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
