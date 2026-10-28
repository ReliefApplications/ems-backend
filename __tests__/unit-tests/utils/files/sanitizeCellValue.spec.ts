import { Workbook } from 'exceljs';
import { sanitizeCellValue } from '@utils/files/format.helper';
import csvBuilder from '@utils/files/csvBuilder';
import xlsBuilder from '@utils/files/xlsBuilder';

describe('sanitizeCellValue (L-04)', () => {
  it.each([
    [
      '=HYPERLINK("http://evil.example","click")',
      '\'=HYPERLINK("http://evil.example","click")',
    ],
    ['=cmd|/C calc!A0', "'=cmd|/C calc!A0"],
    ['+1+1', "'+1+1"],
    ['-2+3', "'-2+3"],
    ['@SUM(A1:A2)', "'@SUM(A1:A2)"],
    ['\t=1+1', "'\t=1+1"],
    ['\r=1+1', "'\r=1+1"],
    ['- item', "'- item"],
  ])('neutralises %p', (value, expected) => {
    expect(sanitizeCellValue(value)).toBe(expected);
  });

  it.each([['plain text'], ['a=b'], ['-12.5'], ['+3'], ['-0'], ['']])(
    'keeps %p',
    (value) => {
      expect(sanitizeCellValue(value)).toBe(value);
    }
  );

  it.each([[-5], [0], [null], [undefined], [true], [new Date(0)], [{ a: 1 }]])(
    'leaves non-string value %p untouched',
    (value) => {
      expect(sanitizeCellValue(value)).toBe(value);
    }
  );
});

describe('export builders neutralise formulas (L-04)', () => {
  const columns = [
    { name: 'title', title: 'Title', field: 'title' },
    { name: 'amount', title: 'Amount', field: 'amount' },
  ];
  const data = [
    { title: '=HYPERLINK("http://evil.example")', amount: -5 },
    { title: 'safe', amount: '-7' },
  ];

  it('csvBuilder prefixes formula-like texts and keeps numbers', () => {
    const csv = csvBuilder(columns, data);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('"Title","Amount"');
    expect(lines[1]).toBe('"\'=HYPERLINK(""http://evil.example"")",-5');
    expect(lines[2]).toBe('"safe","-7"');
  });

  it('xlsBuilder prefixes formula-like texts and keeps numbers', async () => {
    const buffer = await xlsBuilder('records', columns, data);
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.getWorksheet(1);
    expect(sheet.getRow(2).getCell(1).value).toBe(
      '\'=HYPERLINK("http://evil.example")'
    );
    expect(sheet.getRow(2).getCell(2).value).toBe(-5);
    expect(sheet.getRow(3).getCell(1).value).toBe('safe');
    expect(sheet.getRow(3).getCell(2).value).toBe('-7');
  });
});
