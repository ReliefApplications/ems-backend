const Workflow = require('../models/workflow');
const Dashboard = require('../models/dashboard');
const { contentType } = require('../const/contentType');

/*  Check if the given page has a content, then delete it if it's not a Form.
*/
async function deleteContent(page) {
    if (page.content) {
        switch (page.type) {
            case contentType.workflow:
                await Workflow.findByIdAndDelete(page.content);
                break;
            case contentType.dashboard:
                await Dashboard.findByIdAndDelete(page.content);
                break;
            default:
                break;
        }
    }
}

module.exports = deleteContent;