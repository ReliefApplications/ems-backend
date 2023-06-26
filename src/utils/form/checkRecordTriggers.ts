import { Form, Record } from 'models';
import * as Survey from 'survey-knockout';
import config from 'config';

/**
 * Pass token before the request to fetch choices by URL if it's targeting SAFE API
 *
 * @param context GraphQL context.
 */
export const passTokenForChoicesByUrlTriggers = (context: any) => {
  Survey.ChoicesRestfull.onBeforeSendRequest = (
    sender: Survey.ChoicesRestful,
    options: { request: XMLHttpRequest }
  ) => {
    if (sender.url.includes(config.get('server.url'))) {
      const token = context.token;
      options.request.setRequestHeader('Authorization', token);
    }
  };
};

export const checkRecordTriggers = (
  record: Record,
  newData: any,
  form: Form,
  context
): Record => {
  passTokenForChoicesByUrlTriggers(context);
  const survey = new Survey.Model(form.structure);
  survey.data = { ...record.data, ...newData };
  const triggers = survey.toJSON().triggers;
  if (triggers) {
    survey.runTriggers();
  }
  const updatedRecord = record;
  updatedRecord.data = survey.data;
  return updatedRecord;
};
