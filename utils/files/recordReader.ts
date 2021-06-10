import { Workbook } from "exceljs";

let workbook;

let fileRows;

// export class Records {}
// export const Records = JSON.parse('{}');

export default async (file: any) => {

    const recordsArray = [];
    let record;
    let curName;
    let curValue;
    let curValueArray = [];
    let isTagBox = false;
    const re = new RegExp('^Q[0-9]*$');
    const reTagBox = new RegExp('.+\/.+');
    workbook = new Workbook();
    workbook.xlsx.load(file).then(() => {
        const worksheet = workbook.getWorksheet(1);

        worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
            console.log("Row " + rowNumber + " = " + JSON.stringify(row.values));
            record = JSON.parse('{}');
            if(rowNumber != 1){
                row.eachCell((cell, colNumber) => {
                    console.log("Cell " + colNumber + " = " + JSON.stringify(cell.value));
                    // if we are on a question
                    if( colNumber >= 3 && re.test(worksheet.getRow(1).getCell(colNumber-2))){

                        // if(isTagBox == false)
                        // {
                            // if it is a tagbox
                        console.log(!re.test(worksheet.getRow(1).getCell(colNumber+1).value));
                        console.log((worksheet.getRow(1).getCell(colNumber+1).value) + '!= _id');
                            if((!re.test(worksheet.getRow(1).getCell(colNumber+1).value)) && ((worksheet.getRow(1).getCell(colNumber+1).value) != '_id')){
                                console.log('tagbox?');
                                console.log(worksheet.getRow(1).getCell(colNumber+1).value);
                                if(reTagBox.test(worksheet.getRow(1).getCell(colNumber+1).value)){
                                    console.log('Tag box found : '+worksheet.getRow(1).getCell(colNumber).value);
                                    isTagBox = true;
                                    curName = worksheet.getRow(1).getCell(colNumber-1);
                                    let i = 0;
                                    while(!re.test(worksheet.getRow(1).getCell(colNumber+i).value) && worksheet.getRow(1).getCell(colNumber+i).value != '_id'){
                                        // worksheet.getRow(rowNumber).eachCell((cell, colNumber) => console.log(cell + ' / ' + colNumber));
                                        console.log('worksheet.getRow(rowNumber).getCell(i).value = '+ worksheet.getRow(rowNumber).getCell(colNumber+i).value);
                                        if(worksheet.getRow(rowNumber).getCell(colNumber+i).value == 1){
                                            curValueArray.push(worksheet.getRow(1).getCell(colNumber+i).value.toString().split('/')[1]);
                                        }
                                        i++;
                                    }
                                    record[curName] = curValueArray;
                                    curValueArray = [];
                                    // cell.value.toString().split(' ').forEach((value, index) => {
                                    //     // console.log('===>');
                                    //     // console.log(value);
                                    //     curValueArray.push(value);
                                    //     record[curName] = curValueArray;
                                    //     curValueArray = [];
                                    // })

                                }
                            }
                            // if not
                            else {
                                console.log("=> elt added <=");
                                curName = worksheet.getRow(1).getCell(colNumber-1);
                                curValue = cell.value;
                                record[curName] = curValue;
                            }

                        // }
                        // else{
                        //     console.log('true!'+colNumber);
                        //     if(!re.test(cell.value)){
                        //         // if(cell.value)
                        //         // curValueArray.push(cell.value.toString().split('/',2));
                        //     }else{
                        //         console.log("tagbox added:");
                        //         console.log(curValueArray);
                        //         record[curName] = curValueArray;
                        //         isTagBox = false;
                        //     }
                        // }

                    }
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
    // console.log("#########");
}
