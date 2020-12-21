import { GraphQLObjectType } from 'graphql';
import addResource from './addResource';
import deleteResource from './deleteResource';
import addForm from './addForm';
import editForm from './editForm';
import editResource from './editResource';
import deleteForm from './deleteForm';
import addRecord from './addRecord';
import editRecord from './editRecord';
import deleteRecord from './deleteRecord';
import addDashboard from './addDashboard';
import editDashboard from './editDashboard';
import deleteDashboard from './deleteDashboard';
import addRole from './addRole';
import editRole from './editRole';
import deleteRole from './deleteRole';
import editUser from './editUser';
import addRoleToUser from './addRoleToUser';
import addApplication from './addApplication';
import editApplication from './editApplication';
import deleteApplication from './deleteApplication';
import addPage from './addPage';
import editPage from './editPage';
import deletePage from './deletePage';
import addWorkflow from './addWorkflow';
import editWorkflow from './editWorkflow';
import deleteWorkflow from './deleteWorkflow';
import addStep from './addStep';
import editStep from './editStep';
import deleteStep from './deleteStep';
import seeNotification from './seeNotification';

// === MUTATIONS ===
const Mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        addResource,
        editResource,
        deleteResource,
        addForm,
        editForm,
        deleteForm,
        addRecord,
        editRecord,
        deleteRecord,
        addDashboard,
        editDashboard,
        deleteDashboard,
        addRole,
        editRole,
        deleteRole,
        editUser,
        addRoleToUser,
        addApplication,
        editApplication,
        deleteApplication,
        addPage,
        editPage,
        deletePage,
        addWorkflow,
        editWorkflow,
        deleteWorkflow,
        addStep,
        editStep,
        deleteStep,
        seeNotification
    }
});

export default Mutation;