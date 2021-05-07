import { Workbook } from "exceljs";

export default async (res, fileName, fields, data) => {
    let workbook = new Workbook();
    let worksheet = workbook.addWorksheet(fileName);

    worksheet.addRow(fields);

    for (const row of data) {
        let x2 = Object.keys(row);
        let temp = []
        for (let y of x2) {
            temp.push(row[y])
        }
        worksheet.addRow(temp);
    }


    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + `${fileName}.xlsx`
    );

    // write to a new buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return res.send(buffer);
}
