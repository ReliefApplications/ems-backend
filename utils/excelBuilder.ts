import csvBuilder from "./csvBuilder";
import xlsBuilder from "./xlsBuilder";

export default (res, fileName, fields, data, extension) => {
    if (extension === 'xlsx') {
        return xlsBuilder(res, fileName, fields, data);
    } else {
        return csvBuilder(res, fileName, fields, data);
    }
}
