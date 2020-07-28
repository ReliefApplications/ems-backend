const { GraphQLError } = require('graphql/error');
const errors = require('../const/errors');

/*  Checks duplication of name in fields array.
    Throw duplication error if duplication exists.
*/
function findDuplicates(fields) {
    const names = fields.map(x => x.name);
    let duplication = names.filter((item, index) => names.indexOf(item) != index);
    if (duplication.length > 0) {
        throw new GraphQLError(errors.dataFieldDuplicated(duplication[0]));
    }
}

module.exports = findDuplicates;