const { GraphQLError } = require('graphql/error');

function findDuplicates(fields) {
    const names = fields.map(x => x.name);
    let duplication = names.filter((item, index) => names.indexOf(item) != index);
    if (duplication.length > 0) {
        throw new GraphQLError(
            `Data name duplicated : ${duplication[0]}. Please provide different value names for all questions.`
        );
    }
}

module.exports = findDuplicates;