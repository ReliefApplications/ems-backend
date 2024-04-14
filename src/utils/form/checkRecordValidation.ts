import { Form, Record } from '@models';
import * as Survey from 'survey-knockout';
// import config from 'config';

/**
 * Pass token before the request to fetch choices by URL if it's targeting SAFE API
 *
 * @param context GraphQL context.
 */
// export const passTokenForChoicesByUrl = (context: any) => {
//   Survey.ChoicesRestfull.onBeforeSendRequest = (
//     sender: Survey.ChoicesRestful,
//     options: { request: XMLHttpRequest }
//   ) => {
//     if (sender.url.includes(config.get('server.url'))) {
//       const token = context.token;
//       options.request.setRequestHeader('Authorization', token);
//     }
//   };
// };

/**
 * Check if the record is correct according to the defined surveyjs validators
 *
 * @param record The record to check
 * @param newData The proposed update
 * @param form The form object linked to the record
 * @param context graphQL context
 * @param lang The current language of the form
 * @returns The list of errors (empty if no errors)
 */
export const checkRecordValidation = (
  record: Record,
  newData: any,
  form: Form,
  context,
  lang = 'en'
): { question: string; errors: string[] }[] => {
  // Necessary to fix 401 errors if we have choicesByUrl targeting self API.
  // passTokenForChoicesByUrl(context);
  // Avoid the choices by url to be called, as it could freeze system depending on the choices
  (Survey.ChoicesRestful as any).getCachedItemsResult = () => true;
  // create the form
  const survey = new Survey.Model(form.structure);
  Survey.settings.commentPrefix = '_comment';
  const structure = JSON.parse(form.structure);
  // Run completion
  const onCompleteExpression = survey.toJSON().onCompleteExpression;
  if (onCompleteExpression) {
    survey.onCompleting.add(() => {
      survey.runExpression(onCompleteExpression);
    });
  }
  survey.locale = lang;
  // fill with the record data
  survey.data = { ...record.data, ...newData };
  // validate the record
  survey.completeLastPage();
  if (survey.hasErrors()) {
    // get all the errors in a array of string format
    // @todo: check if we can do it better
    const questions = survey.getAllQuestions().filter((q) => {
      // Hotfix: bypass matrix validation
      const matrixTypes = ['matrix', 'matrixdropdown', 'matrixdynamic'];
      if (matrixTypes.includes(q.getType())) return false;

      const isSelectType = Survey.Serializer.isDescendantOf(
        q.getType(),
        'selectbase'
      );

      if (!isSelectType || !q.hasErrors()) return true;

      let flatQuestions = structure.pages.map((page) => page.elements).flat();
      const hasPanels = (qs: any[]) => qs.find((q2) => q2.type === 'panel');
      while (hasPanels(flatQuestions)) {
        flatQuestions = flatQuestions
          .map((q2) => (q2.type === 'panel' ? q2.elements : q2))
          .flat();
      }

      // find the question from the structure
      const question = flatQuestions.find((q2) => q2.name === q.name);

      // if it has choices coming from reference data, and has data, skip validation
      if (question.referenceData && { ...record.data, ...newData }[q.name])
        return false;

      return true;
    });

    const errors = questions
      .filter((q) => q.hasErrors())
      .map((q) => {
        return {
          question: q.title || q.name,
          errors: q.getAllErrors().map((err) => err.getText()),
        };
      });
    return errors;
  }
  return [];
};
