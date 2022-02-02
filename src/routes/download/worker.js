
const getFilter = require('../../utils/schema/resolvers/Query/getFilter');
const { User, Resource, Form, Record } = require('../../models');
const defineAbilitiesFor = require('../../security/defineAbilityFor');
const { getFormPermissionFilter } = require('../../utils/filter');
const { fileBuilder, getColumns, getRows } = require('../../utils/files');
const errors = require('../../const/errors');
const { parentPort, workerData } = require('worker_threads');

(async () => { // using async self-executing arrow function for the awaits

    let init = require('../../setup/init'); // You can try to comment this line to see the original error

    parentPort.postMessage('1');


    const contextUser;
    
    try {
        contextUser = await User.findById(workerData.userId).populate('roles');
    } catch(e) {
        parentPort.postMessage(e);
    }
    const ability = defineAbilitiesFor(contextUser);
    
    parentPort.postMessage('2');

    const firstRecordId = workerData.params.ids[0];

    parentPort.postMessage('3');

    const record = await Record.findOne({ _id: firstRecordId }); // Get the first record
    if (!record) {
        throw new Error(errors.dataNotFound);
    }

    parentPort.postMessage('4');

    const id = record.resource || record.form; // Get the record's parent resource / form id
    const form = await Form.findOne({
        $or: [{ _id: id }, { resource: id, core: true }],
    }).select('permissions fields');
    const resource = await Resource.findById(id).select('permissions fields');

    parentPort.postMessage('5');

    // Check if the form exists
    if (!form) { throw new Error(errors.dataNotFound) };

    const defaultFields = [
        { label: 'Id', name: 'id', type: 'text' },
        { label: 'Incremental Id', name: 'incrementalId', type: 'text' },
        { label: 'Created at', name: 'createdAt', type: 'datetime' },
        { label: 'Modified at', name: 'modifiedAt', type: 'datetime' },
    ];
    const structureFields = defaultFields.concat(
        resource ? resource.fields : form.fields
    );

    parentPort.postMessage('6');

    // Filter from the query definition
    const mongooseFilter = getFilter(workerData.params.filter, structureFields);
    Object.assign(
        mongooseFilter,
        { $or: [{ resource: id }, { form: id }] },
        { archived: { $ne: true } }
    );

    let filters = {};
    if (ability.cannot('read', 'Record')) {
        // form.permissions.canSeeRecords.length > 0
        const permissionFilters = getFormPermissionFilter(
            contextUser,
            form,
            'canSeeRecords'
        );
        if (permissionFilters.length > 0) {
            filters = { $and: [mongooseFilter, { $or: permissionFilters }] }; // No way not to bypass the "filters" variable and directly add the permissions to existing permissionFilters
        } else {
            if (form.permissions.canSeeRecords.length > 0) {
                throw new Error(errors.dataNotFound);
            } else {
                filters = mongooseFilter;
            }
        }
    } else {
        filters = mongooseFilter;
    }

    // Builds the columns
    let columns;
    if (!workerData.params.fields) {
        throw new Error(errors.dataNotFound);
    }

    const flatParamFields = workerData.params.fields.flatMap((y) => y.name);
    const displayedFields = structureFields
        .filter((x) => flatParamFields.includes(x.name))
        .map((x) => {
            const paramField = workerData.params.fields.find((y) => x.name === y.name);
            return {
                ...x,
                label: paramField.title || paramField.name,
            };
        })
        .sort((a, b) => {
            return (
                flatParamFields.indexOf(a.name) - flatParamFields.indexOf(b.name)
            );
        });

    columns = await getColumns(displayedFields, authorizationToken);

    // Builds the rows
    const records = await Record.find(filters);
    const rows = await getRows(columns, records);

    parentPort.postMessage(rows);

    // Returns the file
    parentPort.postMessage(fileBuilder(res, form.name, columns, rows, workerData.params.format));

})();
