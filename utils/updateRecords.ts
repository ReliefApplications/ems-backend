import request from "request"
import recordReader from "./files/recordReader";

let records: any;

export default async () => {

    const options = {
        'method': 'GET',
        'url': 'https://kobo.humanitarianresponse.info/assets/a2MN6zEzV6pXMbY3Jx7iCr/submissions/?format=json',
        'headers': {
            'Authorization': 'Token 55c9b101af16d7c70e3e0fb4caf817d16758afe3'
        }
    };
    await request(options, (error, response): any => {
        if (error) throw new Error(error);
        records = response.body;
        //console.log(records);
        // return response.body;
    });

    // console.log('*** IN FUNCTION ***');
    // console.log(records);
    // console.log('*** *********** ***');

    return records;
}
