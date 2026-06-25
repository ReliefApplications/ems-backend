import { autoTranslateRecord } from '@utils/form';
import { Record, Form, Resource } from '@models';
import { TranslationService } from '../../../../src/services/translation.service';

jest.mock('../../../../src/services/translation.service');

describe('autoTranslateRecord', () => {
  let mockRecordFindById: jest.SpyInstance;
  let mockFormFindById: jest.SpyInstance;
  let mockResourceFindById: jest.SpyInstance;
  let mockRecordUpdateOne: jest.SpyInstance;
  let mockTranslate: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRecordFindById = jest.spyOn(Record, 'findById');
    mockFormFindById = jest.spyOn(Form, 'findById');
    mockResourceFindById = jest.spyOn(Resource, 'findById');
    mockRecordUpdateOne = jest
      .spyOn(Record, 'updateOne')
      .mockResolvedValue({} as any);

    mockTranslate = jest
      .spyOn(TranslationService.prototype, 'translate')
      .mockResolvedValue('[Translated to uk]: Headache');
  });

  afterEach(() => {
    mockRecordFindById.mockRestore();
    mockFormFindById.mockRestore();
    mockResourceFindById.mockRestore();
    mockRecordUpdateOne.mockRestore();
    mockTranslate.mockRestore();
  });

  it('should auto-translate source field and update record data', async () => {
    const mockRecord = {
      _id: 'record123',
      form: 'form123',
      data: {
        symptom: 'Headache',
      },
    };

    const mockForm = {
      _id: 'form123',
      fields: [
        { name: 'symptom_uk', translateFrom: 'symptom', translateTo: 'uk' },
      ],
    };

    mockRecordFindById.mockResolvedValue(mockRecord as any);
    mockFormFindById.mockResolvedValue(mockForm as any);

    await autoTranslateRecord('record123');

    expect(mockTranslate).toHaveBeenCalledWith('Headache', null, 'uk', 'plain');
    expect(mockRecordUpdateOne).toHaveBeenCalledWith(
      { _id: 'record123' },
      {
        $set: {
          data: {
            symptom: 'Headache',
            symptom_uk: '[Translated to uk]: Headache',
          },
        },
      }
    );
  });

  it('should skip if translateIf expression evaluates to false', async () => {
    const mockRecord = {
      _id: 'record123',
      form: 'form123',
      data: {
        symptom: 'Headache',
        consent: false,
      },
    };

    const mockForm = {
      _id: 'form123',
      structure: JSON.stringify({
        elements: [
          { type: 'text', name: 'symptom' },
          { type: 'boolean', name: 'consent' },
          {
            type: 'text',
            name: 'symptom_uk',
            translateFrom: 'symptom',
            translateTo: 'uk',
            translateIf: '{consent} = true',
          },
        ],
      }),
      fields: [
        {
          name: 'symptom_uk',
          translateFrom: 'symptom',
          translateTo: 'uk',
          translateIf: '{consent} = true',
        },
      ],
    };

    mockRecordFindById.mockResolvedValue(mockRecord as any);
    mockFormFindById.mockResolvedValue(mockForm as any);

    await autoTranslateRecord('record123');

    expect(mockTranslate).not.toHaveBeenCalled();
    expect(mockRecordUpdateOne).not.toHaveBeenCalled();
  });

  it('should skip if target field is in modifiedKeys list (user provided manual translation)', async () => {
    const mockRecord = {
      _id: 'record123',
      form: 'form123',
      data: {
        symptom: 'Headache',
        symptom_uk: 'Manual Ukrainian Translation',
      },
    };

    const mockForm = {
      _id: 'form123',
      fields: [
        { name: 'symptom_uk', translateFrom: 'symptom', translateTo: 'uk' },
      ],
    };

    mockRecordFindById.mockResolvedValue(mockRecord as any);
    mockFormFindById.mockResolvedValue(mockForm as any);

    await autoTranslateRecord('record123', ['symptom', 'symptom_uk']);

    expect(mockTranslate).not.toHaveBeenCalled();
    expect(mockRecordUpdateOne).not.toHaveBeenCalled();
  });

  it('should auto-translate with HTML format for editor type fields', async () => {
    const mockRecord = {
      _id: 'record123',
      form: 'form123',
      data: {
        symptom: '<p>Headache</p>',
      },
    };

    const mockForm = {
      _id: 'form123',
      fields: [
        {
          name: 'symptom_uk',
          type: 'editor',
          translateFrom: 'symptom',
          translateTo: 'uk',
        },
      ],
    };

    mockRecordFindById.mockResolvedValue(mockRecord as any);
    mockFormFindById.mockResolvedValue(mockForm as any);

    await autoTranslateRecord('record123');

    expect(mockTranslate).toHaveBeenCalledWith(
      '<p>Headache</p>',
      null,
      'uk',
      'html'
    );
    expect(mockRecordUpdateOne).toHaveBeenCalledWith(
      { _id: 'record123' },
      {
        $set: {
          data: {
            symptom: '<p>Headache</p>',
            symptom_uk: '[Translated to uk]: Headache',
          },
        },
      }
    );
  });
});
