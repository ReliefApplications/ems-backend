import {
  GraphQLNonNull,
  GraphQLError,
  GraphQLList,
  GraphQLBoolean,
  GraphQLString,
} from 'graphql';
import errors from '../../const/errors';
import * as nodemailer from 'nodemailer';

export default {
  /*  Send an email using parameters.
      Throws an error if not logged in or arguments are invalid.
  */
  type: GraphQLBoolean,
  args: {
    to: { type: new GraphQLNonNull(GraphQLList(GraphQLString)) },
    subject: { type: new GraphQLNonNull(GraphQLString) },
    body: { type: new GraphQLNonNull(GraphQLString) },
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
      host: 'smtp-mail.outlook.com',
      port: 587,
      requireTLS: true,
      auth: {
        user: 'pacome.test@outlook.com', // To put in .env
        pass: 'Testpassword', // To put in .env
      },
    });

    // send mail with defined transport object
    const info = await transporter.sendMail({
      from: '"Pacome Test" <pacome.test@outlook.com>', // sender address
      to: args.to,
      subject: args.subject,
      text: args.body,
      // html: '<b>Hello world?</b>', // html body,
    });

    console.log('Message sent: %s', info.messageId);
    return Boolean(info);
  },
};
