import { Form, Record } from 'models';
import * as Survey from 'survey-knockout';
import { passTokenForChoicesByUrl } from './checkRecordValidation';

/**
 * Pass two array and check all array element are match or not
 *
 * @param logicArray parameter of logicArray.
 * @param matchArray parameter of matchArray.
 * @returns true or false
 */
const isArrayEqual = (logicArray: any, matchArray: any) => {
  if (logicArray.length !== matchArray.length) return false;
  const elements = new Set([...logicArray, ...matchArray]);
  for (const x of elements) {
    const count1 = logicArray.filter((e) => e === x).length;
    const count2 = matchArray.filter((e) => e === x).length;
    if (count1 !== count2) return false;
  }
  return true;
};

/**
 * Pass the logic, record, and replace fields
 *
 * @param logic parameter of logic.
 * @param record parameter of logic.
 * @param replaceData parameter of replaceData.
 * @returns key and value of records
 */
const calculateLogic = (
  logic: any,
  record: any,
  replaceData: any
): { question: any; value: any } => {
  const dataVal = replaceData.split(logic);
  const keyValue = record[dataVal[0].replace("'", '').trim()];
  dataVal[1] = dataVal[1].replace('"', '').trim();
  if (dataVal[1].includes('[')) {
    // GREATERTHAN, GREATERTHAN OR EQUALTO, LESSHAN, LESSHAN OR EQUALTO condition not use in array values.
    dataVal[1] = dataVal[1].replace(/'/g, '"');
    dataVal[1] = JSON.parse(dataVal[1]);
    if (logic == ' empty') {
      dataVal[1] = '';
    } else if (logic == ' notempty') {
      dataVal[1] = dataVal[1] ? dataVal[1] : keyValue ? keyValue : dataVal[1];
    } else if (logic == '  =') {
      dataVal[1] = dataVal[1];
    } else if (logic == ' <>') {
      dataVal[1] = !isArrayEqual(dataVal[1], keyValue) ? keyValue : '';
    } else if (logic == ' contains ') {
      dataVal[1] = keyValue.includes(dataVal[1]) ? keyValue : dataVal[1];
    } else if (logic == ' notcontains ') {
      dataVal[1] = !keyValue.includes(dataVal[1]) ? keyValue : dataVal[1];
    } else if (logic == ' allof ') {
      const allOfData = dataVal[1].every((item) => keyValue.includes(item));
      dataVal[1] = allOfData ? keyValue : dataVal[1];
    } else if (logic == ' anyof ') {
      if (Array.isArray(keyValue)) {
        for (let i = 0; i < dataVal[1].length; i++) {
          if (keyValue.includes(dataVal[1][i])) {
            dataVal[1] = keyValue;
            break;
          }
        }
      } else {
        if (dataVal[1].includes(keyValue)) {
          dataVal[1] = keyValue;
        }
      }
    }
  } else {
    // ALL OF condition not use in string values.
    if (dataVal[1].startsWith("'") && dataVal[1].endsWith("'")) {
      dataVal[1] = dataVal[1].slice(1, -1);
    }

    if (logic == ' empty') {
      dataVal[1] = '';
    } else if (logic == ' notempty') {
      dataVal[1] = dataVal[1] ? dataVal[1] : keyValue ? keyValue : dataVal[1];
    } else if (logic == ' =') {
      dataVal[1] = dataVal[1];
    } else if (logic == ' <>') {
      dataVal[1] = dataVal[1] != keyValue ? keyValue : '';
    } else if (logic == ' contains ') {
      dataVal[1] = keyValue.includes(dataVal[1])
        ? keyValue
        : Array.isArray(keyValue)
        ? [dataVal[1]]
        : dataVal[1];
    } else if (logic == ' notcontains ') {
      dataVal[1] = !keyValue.includes(dataVal[1])
        ? keyValue
        : Array.isArray(keyValue)
        ? [dataVal[1]]
        : dataVal[1];
    } else if (logic == ' > ') {
      dataVal[1] = keyValue.length > dataVal[1].length ? keyValue : dataVal[1];
    } else if (logic == ' < ') {
      dataVal[1] = dataVal[1].length < keyValue.length ? dataVal[1] : keyValue;
    } else if (logic == ' >= ') {
      dataVal[1] = keyValue.length >= dataVal[1].length ? keyValue : dataVal[1];
    } else if (logic == ' <= ') {
      dataVal[1] = dataVal[1].length <= keyValue.length ? dataVal[1] : keyValue;
    }
  }

  return {
    question: [dataVal[0].replace("'", '').trim()],
    value: dataVal[1],
  };
};

/**
 * Check if the record is correct according to the defined surveyjs triggers / logic
 *
 * @param record The record to check
 * @param newData The proposed update
 * @param form The formulaire object linked to the record
 * @param context GraphQL context
 * @param lang The current language of the form
 * @returns triggers data
 */
export const checkTriggerOrLogic = (
  record: Record,
  newData: any,
  form: Form,
  context,
  lang = 'en'
) => {
  // Necessary to fix 401 errors if we have choicesByUrl targeting self API.
  passTokenForChoicesByUrl(context);
  // create the form
  const survey = new Survey.Model(form.structure);
  const onCompleteExpression = survey.toJSON().onCompleteExpression;
  if (onCompleteExpression) {
    survey.onCompleting.add(() => {
      survey.runExpression(onCompleteExpression);
    });
  }
  survey.locale = lang;
  // fill with the record data
  survey.data = { ...record.data, ...newData };

  survey.completeLastPage();

  // if check trigger / logic are avalilable or not
  if (survey.triggers) {
    survey.triggers.map(function (items) {
      // Replace a data with a logic applied to the data
      if (items.propertyHash && items.propertyHash.expression) {
        let logic = items.propertyHash.expression;

        Object.keys(survey.data).forEach(function () {
          logic = logic.replace('{', '');
          logic = logic.replace('}', '');
        });

        const condition = [];
        if (logic.includes(' or ')) {
          logic = logic.split(' or ');
          logic.map(function (result) {
            if (!result.includes(' and ')) {
              condition.push(result.trim());
            } else {
              const andData = result.split(' and ');
              andData.map(function (andCondition) {
                condition.push(andCondition.trim());
              });
            }
          });
        } else if (logic.includes(' and ')) {
          const andData = logic.split(' and ');
          andData.map(function (andCondition) {
            condition.push(andCondition.trim());
          });
        } else {
          condition.push(logic.trim());
        }
        condition.map(function (replaceData) {
          if (replaceData.includes(' empty')) {
            const calculateLogicResult = calculateLogic(
              ' empty',
              survey.data,
              replaceData
            );
            if (calculateLogicResult) {
              survey.data = {
                ...survey.data,
                [calculateLogicResult.question]: calculateLogicResult.value,
              };
            }
          } else if (replaceData.includes(' notempty')) {
            const calculateLogicResult = calculateLogic(
              ' notempty',
              survey.data,
              replaceData
            );
            if (calculateLogicResult) {
              survey.data = {
                ...survey.data,
                [calculateLogicResult.question]: calculateLogicResult.value,
              };
            }
          } else if (replaceData.includes(' =')) {
            const calculateLogicResult = calculateLogic(
              ' =',
              survey.data,
              replaceData
            );
            if (calculateLogicResult) {
              survey.data = {
                ...survey.data,
                [calculateLogicResult.question]: calculateLogicResult.value,
              };
            }
          } else if (replaceData.includes(' <>')) {
            const calculateLogicResult = calculateLogic(
              ' <>',
              survey.data,
              replaceData
            );
            if (calculateLogicResult) {
              survey.data = {
                ...survey.data,
                [calculateLogicResult.question]: calculateLogicResult.value,
              };
            }
          } else if (replaceData.includes(' contains ')) {
            const calculateLogicResult = calculateLogic(
              ' contains ',
              survey.data,
              replaceData
            );
            if (calculateLogicResult) {
              survey.data = {
                ...survey.data,
                [calculateLogicResult.question]: calculateLogicResult.value,
              };
            }
          } else if (replaceData.includes(' notcontains ')) {
            const calculateLogicResult = calculateLogic(
              ' notcontains ',
              survey.data,
              replaceData
            );
            if (calculateLogicResult) {
              survey.data = {
                ...survey.data,
                [calculateLogicResult.question]: calculateLogicResult.value,
              };
            }
          } else if (replaceData.includes(' anyof ')) {
            const calculateLogicResult = calculateLogic(
              ' anyof ',
              survey.data,
              replaceData
            );
            if (calculateLogicResult) {
              survey.data = {
                ...survey.data,
                [calculateLogicResult.question]: calculateLogicResult.value,
              };
            }
          } else if (replaceData.includes(' allof ')) {
            const calculateLogicResult = calculateLogic(
              ' allof ',
              survey.data,
              replaceData
            );
            if (calculateLogicResult) {
              survey.data = {
                ...survey.data,
                [calculateLogicResult.question]: calculateLogicResult.value,
              };
            }
          } else if (replaceData.includes(' > ')) {
            const calculateLogicResult = calculateLogic(
              ' > ',
              survey.data,
              replaceData
            );
            if (calculateLogicResult) {
              survey.data = {
                ...survey.data,
                [calculateLogicResult.question]: calculateLogicResult.value,
              };
            }
          } else if (replaceData.includes(' < ')) {
            const calculateLogicResult = calculateLogic(
              ' < ',
              survey.data,
              replaceData
            );
            if (calculateLogicResult) {
              survey.data = {
                ...survey.data,
                [calculateLogicResult.question]: calculateLogicResult.value,
              };
            }
          } else if (replaceData.includes(' >= ')) {
            const calculateLogicResult = calculateLogic(
              ' >= ',
              survey.data,
              replaceData
            );
            if (calculateLogicResult) {
              survey.data = {
                ...survey.data,
                [calculateLogicResult.question]: calculateLogicResult.value,
              };
            }
          } else if (replaceData.includes(' <= ')) {
            const calculateLogicResult = calculateLogic(
              ' <= ',
              survey.data,
              replaceData
            );
            if (calculateLogicResult) {
              survey.data = {
                ...survey.data,
                [calculateLogicResult.question]: calculateLogicResult.value,
              };
            }
          }
        });
      }

      // Replace a data with a trigger applied to the data
      if (
        items.propertyHash &&
        items.propertyHash.setValue &&
        items.propertyHash.setToName
      ) {
        Object.keys(survey.data).forEach(function (key) {
          if (items.propertyHash.setToName.toString() === key.toString()) {
            survey.data = {
              ...survey.data,
              [key.toString()]: items.propertyHash.setValue,
            };
          }
        });
      }
    });
    return survey.data;
  }
  return {};
};
