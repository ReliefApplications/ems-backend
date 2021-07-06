import { contentType } from '../const/enumTypes';
import { Workflow, Step, Dashboard } from '../models';

/*  Check if the given tab has a content, then delete it if it's not a Form.
    Recursively delete steps of a Workflow if encounter one.
*/
async function deleteContent(tab) {
    if (tab.content) {
        switch (tab.type) {
            case contentType.workflow: {
                const workflow = await Workflow.findByIdAndDelete(tab.content);
                for (let step of workflow.steps) {
                    step = await Step.findByIdAndDelete(step);
                    deleteContent(step);
                }
                break;
            }
            case contentType.dashboard:
                await Dashboard.findByIdAndDelete(tab.content);
                break;
            default:
                break;
        }
    }
}

export default deleteContent;
