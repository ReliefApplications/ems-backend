/*  Errors  
*/
const errors = {
    userNotLogged: 'You must be connected.',
    permissionNotGranted: 'Permission not granted.',
    invalidAddFormArguments: 'Form should either correspond to a new resource or existing resource.',
    invalidEditResourceArguments: 'Either fields or permissions must be provided.',
    invalidAddDashboardArguments: 'Name must be provided.',
    invalidEditDashboardArguments: 'Either name, structure or permissions must be provided.',
    invalidCORS: 'The CORS policy for this site does not allow access from the specified Origin.',
    dataNotFound: 'Data not found',
    resourceDuplicated: 'An existing resource with that name already exists.',
    // TODO: fix method string
    missingDataField: 'Please add a value name to all questions, inside Data tab.',
    dataFieldDuplicated: (name) => `Data name duplicated : ${name}. Please provide different value names for all questions.`
};

module.exports = errors;
