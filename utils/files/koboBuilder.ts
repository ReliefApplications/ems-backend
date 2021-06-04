import { Workbook } from "exceljs";

let workbook;
let worksheetSurvey;
let worksheetChoices;

let qn;

export default async (res, form: any) => {

    workbook = new Workbook();
    worksheetSurvey = workbook.addWorksheet("survey");
    worksheetChoices = workbook.addWorksheet("choices");
    qn = 0;

    worksheetSurvey.columns = [
        {header: 'type', key: 'type'},
        {header: 'name', key: 'name'},
        {header: 'label', key: 'label'},
        {header: 'required', key: 'required'},
        {header: 'calculation', key: 'calculation'},
        {header: 'appearance', key: 'appearance'},
        {header: 'constraint_message', key: 'constraint_message'},
        {header: 'parameters', key: 'parameters'},
        {header: 'kobo--matrix_list', key: 'kobo--matrix_list'},
    ]

    worksheetChoices.columns = [
        {header: 'list_name', key: 'list_name'},
        {header: 'name', key: 'name'},
        {header: 'label', key: 'label'},
        {header: 'media::image', key: 'media::image'},
    ]

    worksheetSurvey.addRow({type: 'start', name: 'start'});
    worksheetSurvey.addRow({type: 'end', name: 'end'});

    for (const q of JSON.parse(form.structure).pages[0].elements){
        convertQuestionSafeKoBo(q);
    }

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
    let typeKoBo;
    let suffix = "";
    qn ++;
    switch(q.type) {
        case "text":

            //2 ones different
            if(q.valueName == "tel")
                typeKoBo = "integer";
            else if(q.valueName == "text")
                typeKoBo = "text";
            else {
                switch (q.inputType){
                    case "date":
                    case "month":
                        typeKoBo = "date";
                        break;
                    case "datetime":
                    case "datetime-local":
                        typeKoBo = "datetime";
                        break;
                    case "email":
                    case "password":
                    case "url":
                    case "week":
                    case "tel":
                    case "color":
                        typeKoBo = "text";
                        break;
                    case "number":
                        typeKoBo = "integer";
                        break;
                    case "range":
                        typeKoBo = "range";
                        break;
                    case "time":
                        typeKoBo = "time";
                        break;
                }
            }

            if(q.inputType == "month") {
                worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: "false", appearance: "month-year"});
            }
            else if(q.inputType == "range") {
                worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: "false", parameters: "start="+q.min+";end="+q.max+";step=1"});
            }
            else {
                worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: "false"});
            }

            break;
        case "comment":
            typeKoBo = "text";
            worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: "false"});
            break;
        case "checkbox":
        case "tagbox":
            typeKoBo = "select_multiple";
            suffix = "sm" + qn;
            typeKoBo = typeKoBo + " " + suffix;

            worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: "false"});

            for (const c of q.choices){
                worksheetChoices.addRow({list_name: suffix, name: c.value, label: c.text})
            }
            break;
        case "radiogroup":
        case "imagepicker":
        case "boolean":
            typeKoBo = "select_one";
            suffix = "so" + qn;
            typeKoBo = typeKoBo + " " + suffix;
            worksheetSurvey.addRow({type: "begin_group", name: q.name, appearance: "field-list"});
            worksheetSurvey.addRow({type: typeKoBo, name: q.name+"_header", label: q.name, appearance: "label"});
            worksheetSurvey.addRow({type: typeKoBo, name: q.title, label: q.title, required: "false", appearance: "list-nolabel"});
            worksheetSurvey.addRow({type: "end_group"});

            if(q.type == "radiogroup") {
                console.log("*** radiogroup ***");
                for (const c of q.choices){
                    worksheetChoices.addRow({list_name: suffix, name: c.value, label: c.text});
                }
            }
            else if(q.type == "imagepicker") {
                console.log("*** imagepicker ***");
                for (const c of q.choices){
                    worksheetChoices.addRow({list_name: suffix, name: c.value, label: c.value, 'media::image': c.imageLink});
                }
            }
            else if(q.type == "boolean") {
                console.log("*** boolean ***");
                worksheetChoices.addRow({list_name: suffix, name: q.labelTrue, label: q.labelTrue});
                worksheetChoices.addRow({list_name: suffix, name: q.labelFalse, label: q.labelFalse});
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
        case "expression":
            typeKoBo = "note";
            worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: "false"});
            break;

        case "file":
            typeKoBo = "file";
            worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: "false"});
            break;
        case "matrix":
            typeKoBo = "select_one";
            suffix = "ma" + qn;
            typeKoBo = typeKoBo + " " + suffix;
            worksheetSurvey.addRow({type: "begin_group", name: q.name, appearance: "field-list"});
            worksheetSurvey.addRow({type: typeKoBo, name: q.name+"_header", label: q.name, appearance: "label"});
            for (const r of q.rows) {
                worksheetSurvey.addRow({type: typeKoBo, name: r.value, label: r.text, required: "false", appearance: "list-nolabel"});
            }
            worksheetSurvey.addRow({type: "end_group"});
            for (const c of q.columns){
                worksheetChoices.addRow({list_name: suffix, name: c.value, label: c.text});
            }
            break;
        case "multipletext":
            typeKoBo = "note";
            worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: "false"});
            typeKoBo = "text";
            for (const i of q.items) {
                worksheetSurvey.addRow({type: typeKoBo, name: i.name, label: i.name, required: "false"});
            }
            break;
        default:
            typeKoBo = "unknow";
            break;
    }

    console.log(typeKoBo);
}
