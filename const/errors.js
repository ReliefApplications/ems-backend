/*  Errors  
*/
const errors = {
    userNotLogged: 'You must be connected.',
    permissionNotGranted: 'Permission not granted.',
    invalidAddFormArguments: 'Form should either correspond to a new resource or existing resource.',
    invalidEditResourceArguments: 'Either fields or permissions must be provided.',
<<<<<<< HEAD
<<<<<<< HEAD
    invalidAddDashboardArguments: 'Dashboard name must be provided.',
    invalidEditDashboardArguments: 'Either name, structure or permissions must be provided.',
    invalidAddApplicationArguments: 'Application name must be provided.',
    invalidEditApplicationArguments: 'Either pages or permissions must be provided.',
    invalidAddPageArguments: 'Page type and linked application ID must be provided.',
=======
    invalidAddDashboardArguments: 'Dashboard ame must be provided.',
=======
    invalidAddDashboardArguments: 'Dashboard name must be provided.',
>>>>>>> 2030f6d... Correct two typos
    invalidEditDashboardArguments: 'Either name, structure or permissions must be provided.',
    invalidAddApplicationArguments: 'Application name must be provided.',
>>>>>>> a32249f... Create models for the application builder
    invalidCORS: 'The CORS policy for this site does not allow access from the specified Origin.',
    dataNotFound: 'Data not found',
    resourceDuplicated: 'An existing resource with that name already exists.',
    missingDataField: 'Please add a value name to all questions, inside Data tab.',
    dataFieldDuplicated: function (name) { return `Data name duplicated : ${name}. Please provide different value names for all questions.`; }
};

module.exports = errors;
