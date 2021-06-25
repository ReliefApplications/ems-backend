import { Workbook } from 'exceljs';

let workbook;

// export class Records {}
// export const Records = JSON.parse('{}');

export default async (file: any) => {

    // *** XLSX Reading ***

    const recordsArray = [];
    let record;
    let curName;
    let curValue;
    let curValueArray = [];

    // diference between cell after a tagbox AND a multiple text component
    // multiple text has a label more than a simple component or tagbox or chackbox
    let alreadyBuild = false;

    const re = new RegExp('^Q[0-9]*$');
    const reTagBox = new RegExp('.+\\/.+');
    const workbook = new Workbook();
    workbook.xlsx.load(file).then(() => {
        const worksheet = workbook.getWorksheet(1);

        worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
            console.log('Row ' + rowNumber + ' = ' + JSON.stringify(row.values));
            // init record
            record = JSON.parse('{}');
            if(rowNumber != 1){
                row.eachCell((cell, colNumber) => {
                    console.log('Cell ' + colNumber + ' = ' + JSON.stringify(cell.value));
                    // if we are on a question
                    if( (colNumber >= 3 && re.test(worksheet.getRow(1).getCell(colNumber-2).text)) || (colNumber >= 4 && re.test(worksheet.getRow(1).getCell(colNumber-3).text) && !re.test(worksheet.getRow(1).getCell(colNumber).text)) ){
                        console.log('QUESTION FOUNDED');
                        //  if it's not a simple component
                        if((!re.test(worksheet.getRow(1).getCell(colNumber+1).text)) && ((worksheet.getRow(1).getCell(colNumber+1).value) != '_id')){
                            // if tagbox || checkbox
                            console.log('FIRST: tagbox & checkbox');
                            if(reTagBox.test(worksheet.getRow(1).getCell(colNumber+1).text)){
                                console.log('tagbox & checkbox');
                                console.log(worksheet.getRow(1).getCell(colNumber+1).text);
                                curName = worksheet.getRow(1).getCell(colNumber-1);
                                let i = 0;
                                while(!re.test(worksheet.getRow(1).getCell(colNumber+i).text) && worksheet.getRow(1).getCell(colNumber+i).value != '_id'){
                                    if(worksheet.getRow(rowNumber).getCell(colNumber+i).value == 1){
                                        // curValueArray.push(worksheet.getRow(1).getCell(colNumber+i).value.toString().split('/')[1]);
                                        curValueArray.push('item'+i+1);
                                    }
                                    i++;
                                }
                                i = 0;
                                record[curName] = curValueArray;
                                curValueArray = [];
                                alreadyBuild = true;
                            }
                            // if not it is a matrix or a multiple text
                            else if (alreadyBuild == false) {
                                console.log('matrix & multiple text');
                                curName = worksheet.getRow(1).getCell(colNumber-2).value
                                let j = 0;
                                const subRecord = JSON.parse('{}');
                                while(!re.test(worksheet.getRow(1).getCell(colNumber+j).text) && worksheet.getRow(1).getCell(colNumber+j).value != '_id'){
                                    const subCurName = worksheet.getRow(1).getCell(colNumber+j).text;
                                    const subCurValue = worksheet.getRow(rowNumber).getCell(colNumber+j).value;
                                    subRecord[subCurName] = subCurValue;
                                    j++;
                                }
                                record[curName] = subRecord;
                            }
                        }
                        // if not
                        else {
                            // console.log("=> elt added <=");
                            curName = worksheet.getRow(1).getCell(colNumber-1);
                            curValue = cell.value;
                            record[curName] = curValue;
                        }
                    }
                    alreadyBuild = false;
                })
                recordsArray.push(record);
                console.log('record');
                console.log(record);
            }
        });

        // Col
        // for (let i=0; i<worksheet.rowCount-1; i++){
        //     tabRecords[i] = JSON.parse('{}');
        // }
        // // const tabRecords = JSON.parse('[]');
        // // const tabRecords: typeof Records[] = [];
        // console.log(tabRecords);
        //
        // // when true then the next cell is the name of the question
        // let n1 = false;
        // // the cel
        // let n2 = false;
        // let name = '';
        // let cellQuest;
        //
        // let i = 1;
        // let iCell = 0;
        // const nbCol = worksheet.columnCount;
        // // console.log(nbCol);
        // // make a test af this pattern on the "name" field of question when creating le form
        // // because if exceljs read this pattern he gonna think that a question will be in the next column
        // const re = new RegExp('^Q[0-9]*$')
        //
        // while (i < nbCol){
        //     // console.log('*** '+i+' ***');
        //     const col = worksheet.getColumn(i);
        //     col.eachCell(function(cell, rowNumber) {
        //         // if(cell.value == 'Q'+i) {
        //         //     console.log('new question');
        //         // }
        //
        //         // console.log(cell.value);
        //         // console.log('iCell = '+iCell);
        //
        //         if(iCell > 0){
        //             if(n2 == true){
        //                 // things
        //                 console.log(cell.value);
        //                 tabRecords[iCell-1][name] = cell.value;
        //             }
        //         }
        //
        //
        //         //iCell == 0 maybe useless
        //         if(iCell == 0){
        //             // console.log('iCell == 0');
        //             if(n1 == true){
        //                 name = cell.value;
        //                 console.log(name);
        //             }
        //             cellQuest = cell;
        //         }
        //
        //         // console.log(cell.value);
        //         // console.log('Q'+i);
        //         iCell++;
        //     });
        //
        //     if(n2 == true){
        //         n2 = false;
        //     }
        //
        //     if(n1 == true){
        //         n1 = false;
        //         n2 = true;
        //     }
        //
        //     // console.log(lastCell.value);
        //     if(re.test(cellQuest.value)){
        //         console.log('RegEx true');
        //         n1 = true;
        //     }
        //
        //     iCell = 0;
        //     i++;
        // }

        console.log('*** data ***');
        console.log(recordsArray);
    });


}
