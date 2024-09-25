import { Form, Record } from 'models';
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
 * @param form The formulaire object linked to the record
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
  // Start to build data
  // const data = { ...record.data, ...newData };
  // Necessary to fix 401 errors if we have choicesByUrl targeting self API.
  // passTokenForChoicesByUrl(context);
  // Avoid the choices by url to be called, as it could freeze system depending on the choices
  (Survey.ChoicesRestful as any).getCachedItemsResult = () => true;
  const structure = JSON.parse(form.structure);
  // create the form
  const survey = new Survey.Model(structure);
  // Survey would try to scroll in a non existing html element
  survey.scrollElementToTop = () => null;

  Survey.settings.commentPrefix = '_comment';
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
  // If error detected, filter out questions based on criteria, and send back the issues
  if (survey.hasErrors()) {
    // Filter questions based on our criteria
    const filteredQuestions = survey.getAllQuestions().filter((question) => {
      if (question.hasErrors()) {
        const isSelectType = Survey.Serializer.isDescendantOf(
          question.getType(),
          'selectbase'
        );
        // eslint-disable-next-line @typescript-eslint/dot-notation
        const jsonObj = { ...question['jsonObj'] };
        if (!isSelectType) {
          return true;
        } else {
          // if it has choices coming from reference data, and has data, skip validation
          if (
            jsonObj.referenceData &&
            { ...record.data, ...newData }[question.name]
          ) {
            return false;
          }

          // if it has choices coming from graphql, and has data, skip validation
          if (jsonObj.gqlUrl && { ...record.data, ...newData }[question.name]) {
            return false;
          }

          return true;
        }
      } else {
        return false;
      }
    });

    // Get all errors in an array
    const errors = filteredQuestions.map((question) => ({
      question: question.title || question.name,
      errors: question.getAllErrors().map((error) => error.getText()),
    }));
    return errors;
  }
  return [];
};
