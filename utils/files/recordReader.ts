import readXlsxFile from 'read-excel-file'
import { Workbook } from "exceljs";

let workbook;

let fileRows;

export default async (file: any) => {

    console.log("### 1 ###");
    workbook = new Workbook();
    workbook.xlsx.load(file).then(() => {
        const worksheet = workbook.getWorksheet(1);
        worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
            console.log("Row " + rowNumber + " = " + JSON.stringify(row.values));
        });
    });
    console.log("#########");

    readXlsxFile(file).then((rows) => {
        console.log('***** rows *****');
        console.log(rows);
        fileRows = rows;

        for (const r of rows){

            // if(r != ('start' || 'end')){
            //
            // }
        }

        console.log('***** ***** *****');
        return rows;
    })
}
