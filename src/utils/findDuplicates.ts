import { GraphQLError } from 'graphql/error';
import errors from '../const/errors';

/*  Checks duplication of name in fields array.
    Throw duplication error if duplication exists.
*/
function findDuplicates(fields) {
    const names = fields.map(x => x.name);
    const duplication = names.filter((item, index) => names.indexOf(item) !== index);
    if (duplication.length > 0) {
        throw new GraphQLError(errors.dataFieldDuplicated(duplication[0]));
    }
}

export default findDuplicates;
