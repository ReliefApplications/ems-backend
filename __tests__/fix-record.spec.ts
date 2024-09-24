import { Form, Record } from '@models';
import { checkRecordValidation } from '@utils/form';

/** Form */
const form: Form = new Form({
  structure:
    '{\n "logoPosition": "right",\n "pages": [\n  {\n   "name": "page1",\n   "elements": [\n    {\n    "type": "tagbox",\n    "name": "affected_countries",\n    "startWithNewLine": false,\n    "title": "Affected Countries/Areas",\n    "valueName": "affected_countries",\n    "isRequired": true,\n    "choicesOrder": "asc",\n    "gqlUrl": "https://dummy.com/graphql/",\n    "gqlQuery": "query {\\n    countrys {\\n        iso2code\\n        shortname\\n    }\\n}",\n    "gqlPath": "data.countrys.*",\n    "gqlValueName": "iso2code",\n    "gqlTitleName": "shortname"\n    }\n   ]\n  }\n ],\n "showQuestionNumbers": "off"\n}',
});

describe('CheckRecordValidation', () => {
  it('Should return empty list if graphql question contains data', () => {
    let record = new Record({
      data: {
        affected_countries: ['IN'],
      },
    });
    let updatedRecordData = {};
    expect(
      checkRecordValidation(record, updatedRecordData, form, undefined)
    ).toEqual([]);

    record = new Record({
      data: {},
    });
    updatedRecordData = {
      affected_countries: ['IN'],
    };
    expect(
      checkRecordValidation(record, updatedRecordData, form, undefined)
    ).toEqual([]);
  });

  it("should throw an error if graphql question doesn't contain data", () => {
    const record = new Record({
      data: {},
    });
    const updatedRecordData = {};
    expect(
      checkRecordValidation(record, updatedRecordData, form, undefined)
    ).toEqual([
      {
        question: 'Affected Countries/Areas',
        errors: ['Response required.'],
      },
    ]);
  });
});
