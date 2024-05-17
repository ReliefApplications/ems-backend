const AVAILABLE_TYPES = [
  'decimal',
  'geopoint',
  // 'select_multiple',
  'date',
  'note',
  // 'begin_score',
  // 'score__row',
  // 'end_score',
  'text',
  'time',
  'file',
  'integer',
  'datetime',
  'acknowledge',
  // 'begin_rank',
  // 'rank__level',
  // 'end_rank',
  'range',
];

export const extractKoboFields = (survey: any, title: string, choices: any) => {
  console.log(choices);
  const questions = {
    title: title,
    pages: [
      {
        name: 'page1',
        elements: [],
      },
    ],
    showQuestionNumbers: 'off',
  };

  survey.map((question: any) => {
    if (AVAILABLE_TYPES.includes(question.type)) {
      switch (question.type) {
        case 'decimal': {
          const newQuestion = {
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            valueName: question.$autoname.toLowerCase(),
            isRequired: question.required,
            inputType: 'number',
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'geopoint': {
          const newQuestion = {
            type: 'geospatial',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            valueName: question.$autoname.toLowerCase(),
            isRequired: question.required,
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'date': {
          const newQuestion = {
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            isRequired: question.required,
            valueName: question.$autoname.toLowerCase(),
            inputType: 'date',
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'note': {
          const newQuestion = {
            type: 'expression',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            valueName: question.$autoname.toLowerCase(),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'text': {
          const newQuestion = {
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            isRequired: question.required,
            valueName: question.$autoname.toLowerCase(),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'time': {
          const newQuestion = {
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            isRequired: question.required,
            valueName: question.$autoname.toLowerCase(),
            inputType: 'time',
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'file': {
          const newQuestion = {
            type: 'file',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            isRequired: question.required,
            valueName: question.$autoname.toLowerCase(),
            storeDataAsText: false,
            maxSize: 7340032,
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'integer': {
          const newQuestion = {
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            isRequired: question.required,
            valueName: question.$autoname.toLowerCase(),
            inputType: 'number',
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'datetime': {
          const newQuestion = {
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            isRequired: question.required,
            valueName: question.$autoname.toLowerCase(),
            inputType: 'datetime-local',
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'acknowledge': {
          const newQuestion = {
            type: 'boolean',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            valueName: question.$autoname.toLowerCase(),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'range': {
          const newQuestion = {
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            valueName: question.$autoname.toLowerCase(),
            inputType: 'range',
            step: question.parameters.split('step=1')[1],
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
      }
    }
  });
  //   "logoPosition": "right",
  //   "pages": [
  //    {
  //     "name": "page1",
  //     "elements": [
  //      {
  //       "type": "text",
  //       "name": "decimal",
  //       "title": "decimal",
  //       "valueName": "decimal",
  //       "inputType": "number"
  //      },
  //      {
  //       "type": "geospatial",
  //       "name": "ponto",
  //       "title": "Ponto",
  //       "valueName": "ponto"
  //      },
  //      {
  //       "type": "checkbox",
  //       "name": "question2",
  //       "title": "Selecionar Multiplos",
  //       "valueName": "question2",
  //       "choices": [
  //        "Item 1",
  //        "Item 2"
  //       ],
  //       "showSelectAllItem": true
  //      },
  //      {
  //       "type": "text",
  //       "name": "data",
  //       "title": "Data",
  //       "valueName": "data",
  //       "inputType": "date"
  //      },
  //      {
  //       "type": "expression",
  //       "name": "nota",
  //       "title": "Nota",
  //       "valueName": "nota"
  //      },
  //      {
  //       "type": "radiogroup",
  //       "name": "avaliacao",
  //       "title": "Avaliação",
  //       "valueName": "avaliacao",
  //       "choices": [
  //        "Item 1",
  //        "Item 2",
  //        "Item 3"
  //       ]
  //      },
  //      {
  //       "type": "text",
  //       "name": "texto",
  //       "title": "texto",
  //       "valueName": "texto"
  //      },
  //      {
  //       "type": "text",
  //       "name": "horario",
  //       "title": "horario",
  //       "valueName": "horario",
  //       "inputType": "time"
  //      },
  //      {
  //       "type": "file",
  //       "name": "arquivo",
  //       "title": "arquivo",
  //       "valueName": "arquivo",
  //       "storeDataAsText": false,
  //       "maxSize": 7340032
  //      },
  //      {
  //       "type": "text",
  //       "name": "numero",
  //       "title": "numero",
  //       "valueName": "numero",
  //       "inputType": "number"
  //      },
  //      {
  //       "type": "text",
  //       "name": "datetime",
  //       "title": "datetime",
  //       "valueName": "datetime",
  //       "inputType": "datetime-local"
  //      },
  //      {
  //       "type": "boolean",
  //       "name": "reconhece",
  //       "title": "reconhece",
  //       "valueName": "reconhece"
  //      },
  //      {
  //       "type": "text",
  //       "name": "intervalo",
  //       "title": "Intervalo",
  //       "valueName": "intervalo",
  //       "inputType": "range"
  //      }
  //     ]
  //    }
  //   ],
  //   "showQuestionNumbers": "off"
  //  }
  return questions;
};
