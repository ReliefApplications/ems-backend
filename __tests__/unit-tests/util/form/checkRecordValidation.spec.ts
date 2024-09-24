import { Form, Record } from '@models';
import { checkRecordValidation } from '@utils/form';

/** Form, you can build new structure using the json editor */
const form = new Form();
/** Existing record */
const record = new Record();
/** Updated record data */
let updatedRecordData = {};

beforeEach(() => {
  form.structure = '';
  record.data = {};
  updatedRecordData = {};
});

describe('CheckRecordValidation', () => {
  it('Should return an error if a question has an error', () => {
    form.structure =
      '{\n "logoPosition": "right",\n "pages": [\n  {\n   "name": "page1",\n   "elements": [\n    {\n     "type": "text",\n     "name": "question1",\n     "isRequired": true\n    }\n   ]\n  }\n ],\n "showQuestionNumbers": "off"\n}';
    expect(
      checkRecordValidation(record, updatedRecordData, form, undefined)
    ).toEqual([
      {
        question: 'question1',
        errors: ['Response required.'],
      },
    ]);
  });

  it('Should return correct error when question is nested into panel', () => {
    form.structure =
      '{\n "logoPosition": "right",\n "pages": [\n  {\n   "name": "page1",\n   "elements": [\n    {\n     "type": "panel",\n     "name": "panel1",\n     "elements": [\n      {\n       "type": "text",\n       "name": "question1",\n       "isRequired": true\n      }\n     ]\n    }\n   ]\n  }\n ],\n "showQuestionNumbers": "off"\n}';
    expect(
      checkRecordValidation(record, updatedRecordData, form, undefined)
    ).toEqual([
      {
        question: 'question1',
        errors: ['Response required.'],
      },
    ]);
  });

  it('Should return correct error when question is not on main page', () => {
    form.structure =
      '{\n "logoPosition": "right",\n "pages": [\n  {\n   "name": "page1",\n   "elements": [\n    {\n     "type": "text",\n     "name": "question2"\n    }\n   ]\n  },\n  {\n   "name": "page2",\n   "elements": [\n    {\n     "type": "panel",\n     "name": "panel1",\n     "elements": [\n      {\n       "type": "text",\n       "name": "question1",\n       "isRequired": true\n      }\n     ]\n    }\n   ]\n  }\n ],\n "showQuestionNumbers": "off"\n}';
    expect(
      checkRecordValidation(record, updatedRecordData, form, undefined)
    ).toEqual([
      {
        question: 'question1',
        errors: ['Response required.'],
      },
    ]);
  });

  it('Should skip question if not visible', () => {
    form.structure =
      '{\n "logoPosition": "right",\n "pages": [\n  {\n   "name": "page1",\n   "elements": [\n    {\n     "type": "text",\n     "name": "question2"\n    }\n   ]\n  },\n  {\n   "name": "page2",\n   "elements": [\n    {\n     "type": "panel",\n     "name": "panel1",\n     "elements": [\n      {\n       "type": "text",\n       "name": "question1",\n       "visible": false,\n       "isRequired": true\n      }\n     ]\n    }\n   ]\n  }\n ],\n "showQuestionNumbers": "off"\n}';
    expect(
      checkRecordValidation(record, updatedRecordData, form, undefined)
    ).toEqual([]);
  });

  it('Should return correct error if question is required based on condition', () => {
    form.structure =
      '{\n "logoPosition": "right",\n "pages": [\n  {\n   "name": "page1",\n   "elements": [\n    {\n     "type": "text",\n     "name": "question1",\n     "isRequired": true,\n     "requiredIf": "{question2} empty"\n    },\n    {\n     "type": "text",\n     "name": "question2"\n    }\n   ]\n  }\n ],\n "showQuestionNumbers": "off"\n}';
    expect(
      checkRecordValidation(record, updatedRecordData, form, undefined)
    ).toEqual([
      {
        question: 'question1',
        errors: ['Response required.'],
      },
    ]);

    updatedRecordData = { question1: 'test' };
    expect(
      checkRecordValidation(record, updatedRecordData, form, undefined)
    ).toEqual([]);

    record.data = { question1: 'test' };
    updatedRecordData = {};
    expect(
      checkRecordValidation(record, updatedRecordData, form, undefined)
    ).toEqual([]);
  });

  it('Should return empty list if graphql question contains data', () => {
    form.structure =
      '{\n "logoPosition": "right",\n "pages": [\n  {\n   "name": "page1",\n   "elements": [\n    {\n    "type": "tagbox",\n    "name": "affected_countries",\n    "startWithNewLine": false,\n    "title": "Affected Countries/Areas",\n    "valueName": "affected_countries",\n    "isRequired": true,\n    "choicesOrder": "asc",\n    "gqlUrl": "https://dummy.com/graphql/",\n    "gqlQuery": "query {\\n    countrys {\\n        iso2code\\n        shortname\\n    }\\n}",\n    "gqlPath": "data.countrys.*",\n    "gqlValueName": "iso2code",\n    "gqlTitleName": "shortname"\n    }\n   ]\n  }\n ],\n "showQuestionNumbers": "off"\n}';
    record.data = {
      affected_countries: ['IN'],
    };
    updatedRecordData = {};
    expect(
      checkRecordValidation(record, updatedRecordData, form, undefined)
    ).toEqual([]);

    record.data = {};
    updatedRecordData = {
      affected_countries: ['IN'],
    };
    expect(
      checkRecordValidation(record, updatedRecordData, form, undefined)
    ).toEqual([]);
  });

  it("Should return an error if graphql question doesn't contain data", () => {
    form.structure =
      '{\n "logoPosition": "right",\n "pages": [\n  {\n   "name": "page1",\n   "elements": [\n    {\n    "type": "tagbox",\n    "name": "affected_countries",\n    "startWithNewLine": false,\n    "title": "Affected Countries/Areas",\n    "valueName": "affected_countries",\n    "isRequired": true,\n    "choicesOrder": "asc",\n    "gqlUrl": "https://dummy.com/graphql/",\n    "gqlQuery": "query {\\n    countrys {\\n        iso2code\\n        shortname\\n    }\\n}",\n    "gqlPath": "data.countrys.*",\n    "gqlValueName": "iso2code",\n    "gqlTitleName": "shortname"\n    }\n   ]\n  }\n ],\n "showQuestionNumbers": "off"\n}';
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
