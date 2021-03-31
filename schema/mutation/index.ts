import { GraphQLObjectType } from 'graphql';
import deleteResource from './deleteResource';
import addForm from './addForm';
import editForm from './editForm';
import editResource from './editResource';
import deleteForm from './deleteForm';
import addRecord from './addRecord';
import editRecord from './editRecord';
import deleteRecord from './deleteRecord';
import convertRecord from './convertRecord';
import addDashboard from './addDashboard';
import editDashboard from './editDashboard';
import deleteDashboard from './deleteDashboard';
import addRole from './addRole';
import editRole from './editRole';
import deleteRole from './deleteRole';
import editUser from './editUser';
import addRoleToUsers from './addRoleToUsers';
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
import seeNotifications from './seeNotifications';
import publishNotification from './publishNotification';
import addChannel from './addChannel';
import deleteChannel from './deleteChannel';
import publish from './publish';
import addSubscription from './addSubscription';
import deleteSubscription from './deleteSubscription';
import editSubscription from './editSubscription';
import duplicateApplication from './duplicateApplication';
import addPositionAttributeCategory from './addPositionAttributeCategory';
import addPositionAttribute from './addPositionAttribute';
import deletePositionAttributeCategory from './deletePositionAttributeCategory';
import editPositionAttributeCategory from './editPositionAttributeCategory';

// === MUTATIONS ===
const Mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        editResource,
        deleteResource,
        addForm,
        editForm,
        deleteForm,
        addRecord,
        editRecord,
        deleteRecord,
        convertRecord,
        addDashboard,
        editDashboard,
        deleteDashboard,
        addRole,
        editRole,
        deleteRole,
        editUser,
        addRoleToUsers,
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
        seeNotification,
        seeNotifications,
        publishNotification,
        addChannel,
        deleteChannel,
        publish,
        addSubscription,
        deleteSubscription,
        editSubscription,
        duplicateApplication,
        addPositionAttributeCategory,
        addPositionAttribute,
        deletePositionAttributeCategory,
        editPositionAttributeCategory
    }
});

export default Mutation;