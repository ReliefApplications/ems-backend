import { Form, Record } from '@models';
import * as Survey from 'survey-knockout';

/**
 * Check record triggered values, so inline edition ( draft edition ) can indicate changes on the data
 *
 * @param record edited record
 * @param newData record updated data
 * @param form template to use
 * @param context graphQLContext
 * @returns New record data
 */
export const checkRecordTriggers = (
  record: Record,
  newData: any,
  form: Form,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context
): Record => {
  // Necessary to fix 401 errors if we have choicesByUrl targeting self API.
  // passTokenForChoicesByUrl(context);
  // Avoid the choices by url to be called, as it could freeze system depending on the choices
  (Survey.ChoicesRestful as any).getCachedItemsResult = () => true;
  const survey = new Survey.Model(form.structure);
  Survey.settings.commentPrefix = '_comment';
  survey.data = { ...record.data, ...newData };
  const triggers = survey.toJSON().triggers;
  if (triggers) {
    survey.runTriggers();
  }
  const updatedRecord = new Record(record);
  updatedRecord.data = survey.data;
  return updatedRecord;
};
