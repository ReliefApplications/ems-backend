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
import { extractGridData, preprocess } from '../../utils/files';
import xlsBuilder from '../../utils/files/xlsBuilder';
import { Placeholders } from '../../const/placeholders';
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

    // Create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      requireTLS: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Fetch records data for attachment / body if needed
    let attachment: any;
    let fileName: string;
    let columns: any[];
    let rows: any[];
    if (args.attachment || args.body.includes(Placeholders.DATASET)) {
      ({ columns, rows } = await extractGridData(
        {
          query: args.gridSettings.query,
          ids: args.gridSettings.ids,
          sortField: args.gridSettings.sortField,
          sortOrder: args.gridSettings.sortOrder,
          format: 'xlsx',
          fields: args.gridSettings.query.fields,
          filter: {
            logic: 'and',
            filters: [
              {
                operator: 'eq',
                field: 'ids',
                value: args.gridSettings.ids,
              },
            ],
          },
        },
        context.token
      ));
    }
    if (args.attachment) {
      const today = new Date();
      const month = today.toLocaleString('en-us', { month: 'short' });
      const date = month + ' ' + today.getDate() + ' ' + today.getFullYear();
      const name = args.gridSettings.query.name.substring(3);
      fileName = name + ' ' + date;
      attachment = await xlsBuilder(fileName, columns, rows);
    }

    // Preprocess body and subject
    const body = preprocess(args.body, {
      fields: args.gridSettings.query.fields,
      rows,
    });
    const subject = preprocess(args.subject);

    // Send mail
    const info = await transporter.sendMail({
      from: `"No reply" <${process.env.MAIL_USER}>`,
      to: args.to,
      subject,
      html: body,
      attachments: [
        {
          filename: `${fileName}.xlsx`,
          content: attachment,
        },
      ],
    });

    return Boolean(info);
  },
};
