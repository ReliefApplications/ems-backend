import { GraphQLError } from 'graphql';
import errors from '../../../../const/errors';
import { Record, Form } from '../../../../models';

export default () =>
  async (_, { id, display }, context) => {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const record: any = await Record.findOne({
      _id: id,
      archived: { $ne: true },
    });
    if (display) {
      record.display = display;
      record.fields = (await Form.findById(record.form, 'fields')).fields;
    }
    return record;
  };
