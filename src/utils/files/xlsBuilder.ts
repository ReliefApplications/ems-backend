import { Workbook } from 'exceljs';

export default async (res, fileName: string, fields, data) => {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(fileName);

    const headerRow = worksheet.addRow(fields);
    headerRow.font = {
        color: { argb: 'FFFFFFFF'}
    };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF008DC9' }
    };
    headerRow.border = {
        top: {style:'thin'},
        left: {style:'thin'},
        bottom: {style:'thin'},
        right: {style:'thin'}
    };

    for (const row of data) {
        const temp = []
        for (const field of fields) {
            temp.push(row[field] || null);
        }
        worksheet.addRow(temp);
    }


    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
        'Content-Disposition',
        'attachment; filename=' + `${fileName}.xlsx`
    );

    // write to a new buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return res.send(buffer);
}
