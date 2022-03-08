import {
  GraphQLNonNull,
  GraphQLError,
  GraphQLList,
  GraphQLBoolean,
  GraphQLString,
} from 'graphql';
import errors from '../../const/errors';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import GridSettingsInputType from '../inputs/grid-settings';
dotenv.config();

export default {
  /*  Send an email using parameters.
      Throws an error if not logged in or arguments are invalid.
  */
  type: GraphQLBoolean,
  args: {
    to: { type: new GraphQLNonNull(GraphQLList(GraphQLString)) },
    subject: { type: new GraphQLNonNull(GraphQLString) },
    body: { type: new GraphQLNonNull(GraphQLString) },
    gridSettings: { type: GridSettingsInputType },
    attachment: { type: GraphQLBoolean },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }

    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      requireTLS: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // send mail with defined transport object
    const info = await transporter.sendMail({
      from: `"No reply" <${process.env.MAIL_USER}>`, // sender address
      to: args.to,
      subject: args.subject,
      text: args.body,
      // html: '<b>Hello world?</b>', // html body,
    });

    console.log('Message sent: %s', info.messageId);
    return Boolean(info);
  },
};
