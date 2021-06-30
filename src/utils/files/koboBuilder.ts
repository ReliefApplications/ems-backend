import { Workbook } from 'exceljs';

let workbook;
let worksheetSurvey;
let worksheetChoices;
let worksheetSettings

let qn;

export default async (form: any) => {

    workbook = new Workbook();
    worksheetSurvey = workbook.addWorksheet('survey');
    worksheetChoices = workbook.addWorksheet('choices');
    worksheetSettings = workbook.addWorksheet('settings');
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

    worksheetSettings.columns = [
        {header: 'style', key: 'style'}
    ]

    worksheetSurvey.addRow({type: 'start', name: 'start'});
    worksheetSurvey.addRow({type: 'end', name: 'end'});

    for (const q of JSON.parse(form.structure).pages[0].elements){
        console.log(q);
        convertQuestionSafeKoBo(q);
    }

    // res.setHeader(
    //     "Content-Type",
    //     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    // );
    // res.setHeader(
    //     "Content-Disposition",
    //     "attachment; filename=" + `${form.name}.xlsx`
    // );

    // write to a new buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
    // return res.send(buffer);
}

function convertQuestionSafeKoBo(q) {
    let typeKoBo;
    let suffix = '';
    qn ++;

    let suffix_choice;

    switch(q.type) {
        case 'text':
            // text doesn't have inputType
            if(q.inputType == null){
                typeKoBo = 'text';
            }
            else {
                switch (q.inputType){
                    case 'date':
                        typeKoBo = 'date';
                        break;
                    case 'datetime':
                    case 'datetime-local':
                        typeKoBo = 'datetime';
                        break;
                    case 'email':
                    case 'password':
                    case 'url':
                    case 'week':
                    case 'month':
                    case 'tel':
                    case 'color':
                        typeKoBo = 'text';
                        break;
                    case 'number':
                        typeKoBo = 'integer';
                        break;
                    case 'range':
                        typeKoBo = 'range';
                        break;
                    case 'time':
                        typeKoBo = 'time';
                        break;
                }
            }

            if(q.inputType == 'month') {
                worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: 'false', appearance: 'month-year'});
            }
            else if(q.inputType == 'range') {
                worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: 'false', parameters: 'start='+q.min+';end='+q.max+';step=1'});
            }
            else {
                worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: 'false'});
            }

            break;
        case 'comment':
            typeKoBo = 'text';
            worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: 'false'});
            break;
        case 'checkbox':
        case 'tagbox':
            typeKoBo = 'select_multiple';
            suffix = 'sm' + qn;
            typeKoBo = typeKoBo + ' ' + suffix;
            worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: 'false'});

            formateChoices(suffix, q.choices);
            break;
        case 'radiogroup':
        case 'imagepicker':
        case 'boolean':
            typeKoBo = 'select_one';
            suffix = 'so' + qn;
            typeKoBo = typeKoBo + ' ' + suffix;
            worksheetSurvey.addRow({type: 'begin_group', name: q.name, appearance: 'field-list'});
            worksheetSurvey.addRow({type: typeKoBo, name: q.name+'_header', appearance: 'label'});
            worksheetSurvey.addRow({type: typeKoBo, name: q.title, label: q.title, required: 'false', appearance: 'list-nolabel'});
            worksheetSurvey.addRow({type: 'end_group'});

            if(q.type == 'radiogroup') {
                formateChoices(suffix, q.choices);
            }
            else if(q.type == 'imagepicker') {
                for (const c of q.choices){
                    worksheetChoices.addRow({list_name: suffix, name: c.value, label: c.value, 'media::image': c.imageLink});
                }
            }
            else if(q.type == 'boolean') {
                console.log('*** boolean ***');
                worksheetChoices.addRow({list_name: suffix, name: q.labelTrue, label: q.labelTrue});
                worksheetChoices.addRow({list_name: suffix, name: q.labelFalse, label: q.labelFalse});
            }
            break;
        case 'dropdown':
            typeKoBo = 'select_one';
            suffix = 'so' + qn;
            typeKoBo = typeKoBo + ' ' + suffix;
            worksheetSurvey.addRow({type: 'begin_group', name: q.name, appearance: 'field-list'});
            worksheetSurvey.addRow({type: typeKoBo, name: q.title, label: q.title, required: 'true', appearance: 'minimal'});
            worksheetSurvey.addRow({type: 'end_group'});

            formateChoices(suffix, q.choices);
            break;
        case 'expression':
            typeKoBo = 'note';
            worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: 'false'});
            break;

        case 'file':
            typeKoBo = 'file';
            worksheetSurvey.addRow({type: typeKoBo, name: q.name, label: q.title, required: 'false'});
            break;
        case 'matrix':
            typeKoBo = 'select_one';
            suffix = 'ma' + qn;
            typeKoBo = typeKoBo + ' ' + suffix;
            worksheetSurvey.addRow({type: 'begin_group', name: q.name, appearance: 'field-list'});
            worksheetSurvey.addRow({type: typeKoBo, name: q.name+'_header', label: q.title, appearance: 'label'});
            for (const r of q.rows) {
                worksheetSurvey.addRow({type: typeKoBo, name: r.value, label: r.text, required: 'false', appearance: 'list-nolabel'});
            }
            worksheetSurvey.addRow({type: 'end_group'});

            formateChoices(suffix, q.columns);
            break;
        case 'matrixdropdown':
            typeKoBo = 'select_one';
            suffix = 'ma' + qn;
            // console.log('$$$$$$$$$$$$$$$$$$$$$ cn');
            // console.log(cn);
            suffix_choice = 'yn' + qn;
            typeKoBo = typeKoBo + ' ' + suffix_choice;
            worksheetSurvey.addRow({type: 'begin_group', name: q.name, label: q.title, appearance: 'field-list'});
            worksheetSurvey.addRow({type: 'begin_kobomatrix', name: q.name, label: q.title, 'kobo--matrix_list': suffix});
            for (const c of q.columns) {
                worksheetSurvey.addRow({type: typeKoBo, name: c.name, label: c.title, required: 'true'});
            }
            worksheetSurvey.addRow({type: 'end_kobomatrix'});
            worksheetSurvey.addRow({type: 'end_group'});
            for (const r of q.rows){
                worksheetChoices.addRow({list_name: suffix, name: r.value, label: r.text});
            }
            for (const ch of q.choices){
                worksheetChoices.addRow({list_name: suffix_choice, name: ch.toString(), label: ch.toString()});
            }
            worksheetSettings.addRow({style: 'theme-grid no-text-transform'});
            // cn++;
            break;
        case 'multipletext':
            typeKoBo = 'text';
            // worksheetSurvey.addRow({type: "note", name: q.name+"_label", label: question_header});
            // worksheetSurvey.addRow({type: "note", name: q.name, label: q.name});

            //worksheetSurvey.addRow({type: "note", name: q.name, label: q.title, required: "false"});
            worksheetSurvey.addRow({type: 'begin_group', name: q.name, label: q.title});
            for (const i of q.items) {
                worksheetSurvey.addRow({type: typeKoBo, name: i.name, label: i.name, required: 'false'});
            }
            worksheetSurvey.addRow({type: 'end_group'});
            break;
        default:
            typeKoBo = 'unknow';
            break;
    }

    console.log(typeKoBo);
}

function formateChoices(suffix, choices) {
    for (const c of choices){
        if(c.value == null || c.text == null){
            worksheetChoices.addRow({list_name: suffix, name: c.toString().split(' ').join(''), label: c})
        }
        else {
            worksheetChoices.addRow({list_name: suffix, name: c.value, label: c.text})
        }
    }
}
