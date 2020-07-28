const errors = {
    userNotLogged: 'You must be connected.',
    permissionNotGranted: 'Permission not granted.',
    // TODO fix
    missingDataField: 'Please add a value name to all questions, inside Data tab.',
    dataFieldDuplicated: (name) => `Data name duplicated : ${name}. Please provide different value names for all questions.`
};

module.exports = errors;
