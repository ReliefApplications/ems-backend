export const extractKoboFields = (survey: any) => {
    survey.map((question: any) => {
        console.log(question);
    })
    // {
    //     "pages": [
    //      {
    //       "name": "page1",
    //       "elements": [
    //        {
    //         "type": "text",
    //         "name": "question_1",
    //         "title": "Question 1",
    //         "description": "What is the most famous rockstar?",
    //         "valueName": "question_1"
    //        },
    //        {
    //         "type": "text",
    //         "name": "question2",
    //         "description": "What is the best singer in rock?",
    //         "valueName": "question2"
    //        },
    //        {
    //         "type": "dropdown",
    //         "name": "choose_your_favorite_rock_genre",
    //         "title": "Choose your favorite rock genre",
    //         "valueName": "choose_your_favorite_rock_genre",
    //         "choices": [
    //          {
    //           "value": "item1",
    //           "text": "Progressive"
    //          },
    //          {
    //           "value": "item2",
    //           "text": "Psicodelic"
    //          },
    //          {
    //           "value": "item3",
    //           "text": "Heavy metal"
    //          }
    //         ]
    //        },
    //        {
    //         "type": "checkbox",
    //         "name": "which_is_the_better_rock_band_of_all_time",
    //         "title": "Which is the better rock band of all time",
    //         "valueName": "which_is_the_better_rock_band_of_all_time",
    //         "choices": [
    //          {
    //           "value": "item1",
    //           "text": "The Beatles"
    //          },
    //          {
    //           "value": "item2",
    //           "text": "The Rolling Stones"
    //          },
    //          {
    //           "value": "item3",
    //           "text": "Queen"
    //          },
    //          {
    //           "value": "item4",
    //           "text": "Pink Floyd"
    //          }
    //         ]
    //        },
    //        {
    //         "type": "geospatial",
    //         "name": "question1",
    //         "valueName": "question1",
    //         "geoFields": [
    //          {
    //           "value": "city",
    //           "label": "City"
    //          }
    //         ]
    //        },
    //        {
    //         "type": "geospatial",
    //         "name": "question3",
    //         "valueName": "question3"
    //        },
    //        {
    //         "type": "geospatial",
    //         "name": "question4",
    //         "valueName": "question4",
    //         "geoFields": [
    //          {
    //           "value": "coordinates",
    //           "label": "coordenadas"
    //          },
    //          {
    //           "value": "city",
    //           "label": "cidade"
    //          }
    //         ]
    //        }
    //       ]
    //      }
    //     ],
    //     "showQuestionNumbers": "off"
    //    }
    return "";
};