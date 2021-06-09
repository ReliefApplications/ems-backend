import readXlsxFile from 'read-excel-file'
import { Workbook } from "exceljs";

let workbook;

let fileRows;

export default async (file: any) => {

    console.log("### 1 ###");
    workbook = new Workbook();
    workbook.xlsx.load(file).then(() => {
        const worksheet = workbook.getWorksheet(1);

        // worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
        //     console.log("Row " + rowNumber + " = " + JSON.stringify(row.values));
        // });

        // worksheet.eachColumnKey(function (col, colNumber){
        //     console.log("Col " + colNumber + " = " + JSON.stringify(col.values));
        // });

        let i = 1;
        const nbCol = worksheet.columnCount;
        console.log(nbCol);
        const re = new RegExp('^Q[0-9]*$')

        while (i < nbCol){
            console.log('*** '+i+' ***');
            const col = worksheet.getColumn(i);
            col.eachCell(function(cell, rowNumber) {
                // if(cell.value == 'Q'+i) {
                //     console.log('new question');
                // }
                if(re.test(cell.value)){
                    console.log('RegEx true');
                }
                console.log(cell.value);
                console.log('Q'+i);
            });
            i++;
        }

        // worksheet.columns.forEach((col) => {
        //     // console.log(col._worksheet._colums);
        //     col.eachCell((cell, cellNumber) => {
        //         console.log(cell);
        //     })
        // })
    });
    console.log("#########");

    readXlsxFile(file).then((rows) => {
        console.log('***** rows *****');
        // console.log(rows);
        // fileRows = rows;

        // for (const r of rows){
        // }

        console.log('***** ***** *****');
        return rows;
    })
}
