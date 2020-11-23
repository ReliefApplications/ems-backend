/*  Errors  
*/
const errors = {
    userNotLogged: 'You must be connected.',
    permissionNotGranted: 'Permission not granted.',
    invalidAddFormArguments: 'Form should either correspond to a new resource or existing resource.',
    invalidEditResourceArguments: 'Either fields or permissions must be provided.',
    invalidAddDashboardArguments: 'Dashboard name must be provided.',
    invalidEditDashboardArguments: 'Either name, structure or permissions must be provided.',
    invalidAddApplicationArguments: 'Application name must be provided.',
    invalidEditApplicationArguments: 'Either name, status, pages, settings or permissions must be provided.',
    invalidAddPageArguments: 'Page type must be an available type and linked application ID must be provided.',
    invalidEditPageArguments: 'Either name or permissions must be provided.',
    invalidAddWorkflowArguments: 'Page id must be provided.',
    invalidEditWorkflowArguments: 'Either name, steps or permissions must be provided.',
    invalidAddStepArguments: 'Step type must be an available type and linked workflow ID must be provided.',
    invalidEditStepArguments: 'Either name, type, content or permissions must be provided.',
    invalidCORS: 'The CORS policy for this site does not allow access from the specified Origin.',
    dataNotFound: 'Data not found',
    resourceDuplicated: 'An existing resource with that name already exists.',
    pageTypeError: 'The page passed in argument is not a workflow type.',
    missingDataField: 'Please add a value name to all questions, inside Data tab.',
    dataFieldDuplicated: function (name) { return `Data name duplicated : ${name}. Please provide different value names for all questions.`; }
};

module.exports = errors;
