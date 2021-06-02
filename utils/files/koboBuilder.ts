import { Workbook } from "exceljs";

const workbook = new Workbook();
const worksheetSurvey = workbook.addWorksheet("survey");
const worksheetChoices = workbook.addWorksheet("choices");

let qn = 0;

export default async (res, form: any) => {

    worksheetSurvey.columns = [
        {header: 'type', key: 'type'},
        {header: 'name', key: 'name'},
        {header: 'label', key: 'label'},
        {header: 'required', key: 'required'},
        {header: 'calculation', key: 'calculation'},
        {header: 'appearance', key: 'appearance'},
        {header: 'constraint_message', key: 'constraint_message'},
        {header: 'parameters', key: 'parameters'},
    ]

    worksheetChoices.columns = [
        {header: 'list_name', key: 'list_name'},
        {header: 'name', key: 'name'},
        {header: 'label', key: 'label'},
    ]

    worksheetSurvey.addRow({type: 'start', name: 'start'});
    worksheetSurvey.addRow({type: 'end', name: 'end'});

    // console.log('---------------1---------------');
    // console.log(form.structure);
    // console.log('---------------2---------------');
    // console.log(form.structure.pages);
    // console.log('---------------3---------------');
    // // console.log(form.structure.pages["elements"]);
    // console.log('---------------4---------------');
    // console.log(JSON.stringify(form.structure));
    // console.log('---------------5---------------');
    // console.log(JSON.parse(form.structure));
    // console.log('---------------6---------------');
    // console.log(JSON.parse(form.structure).pages);
    // console.log('---------------7---------------');
    // console.log(JSON.parse(form.structure).pages["elements"]);
    // console.log('---------------8---------------');
    // console.log(JSON.parse(form.structure).pages[0].elements);
    // console.log('---------------9---------------');

    console.log('*******************************');
    console.log('*******************************');
    for (const q of JSON.parse(form.structure).pages[0].elements){
        console.log(q);
        convertQuestionSafeKoBo(q);
        console.log('-------------------------------');
    }
    console.log('*******************************');
    console.log('*******************************');

    // worksheet.addRow(fields);
    //
    // for (const row of data) {
    //     const x2 = Object.keys(row);
    //     const temp = []
    //     for (const y of x2) {
    //         temp.push(row[y])
    //     }
    //     worksheet.addRow(temp);
    // }


    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + `${form.name}.xlsx`
    );

    // write to a new buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return res.send(buffer);
}

function convertQuestionSafeKoBo(q) {
    let typeKoBo = "";
    let suffix = "";
    qn ++;
    switch(q.type) {
        case "text":
            typeKoBo = "text";
            worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: "false"});
            break;
        case "checkbox":
            typeKoBo = "select_multiple";
            suffix = "sm" + qn;
            typeKoBo = typeKoBo + " " + suffix;

            worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: "false"});

            for (const c of q.choices){
                worksheetChoices.addRow({list_name: suffix, name: c.value, label: c.text})
            }
            break;
        case "radiogroup":
            typeKoBo = "select_one";
            suffix = "so" + qn;
            typeKoBo = typeKoBo + " " + suffix;
            worksheetSurvey.addRow({type: "begin_group", name: q.name, appearance: "field-list"});
            worksheetSurvey.addRow({type: typeKoBo, name: q.name+"_header", label: q.name, appearance: "label"});
            worksheetSurvey.addRow({type: typeKoBo, name: q.title, label: q.title, required: "false", appearance: "list-nolabel"});
            worksheetSurvey.addRow({type: "end_group"});

            for (const c of q.choices){
                worksheetChoices.addRow({list_name: suffix, name: c.value, label: c.text})
            }
            break;
        case "dropdown":
            typeKoBo = "select_one";
            suffix = "so" + qn;
            typeKoBo = typeKoBo + " " + suffix;
            worksheetSurvey.addRow({type: "begin_group", name: q.name, appearance: "field-list"});
            worksheetSurvey.addRow({type: "note", name: q.name+"_label", label: q.name});
            worksheetSurvey.addRow({type: typeKoBo, name: q.title, label: q.title, required: "true", appearance: "minimal"});
            worksheetSurvey.addRow({type: "end_group"});

            for (const c of q.choices){
                worksheetChoices.addRow({list_name: suffix, name: c.value, label: c.text})
            }
            break;
        default:
            typeKoBo = "unknow";
            break;
    }

    console.log(typeKoBo);
}
