function transformRecord(data, fields) {
    for (const value in data) {
        console.log(data);
        if (data.hasOwnProperty(value)) {
            const field = fields.find(x => x.name === value);
            switch (field.type) {
                case 'date':
                    data[value] = new Date(data[value]);
                    break;
                case 'datetime':
                    data[value] = new Date(data[value]);
                    break;
                case 'datetime-local':
                    data[value] = new Date(data[value]);
                    break;
                case 'time':
                    if (!(data[value] instanceof Date) && data[value] != null) {
                        const hours = data[value].slice(0, 2);
                        const minutes = data[value].slice(3);
                        data[value] = new Date(Date.UTC(1970, 0, 1, hours, minutes));
                    }
                    break;
                default:
                    break;
            }
        }
    }
    return data;
}

export default transformRecord;