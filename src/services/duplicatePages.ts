import errors from '../const/errors';
import { GraphQLError } from 'graphql';
import { Page, Application, Workflow, Dashboard, Form, Step} from '../models';

/*  Creates new pages from a given application and returns them in an array
*/
async function duplicatePages(application: Application) {
    const copiedPages = [];
    await Promise.all(application.pages.map(async pageId => {
        console.log('duplcating page with id ', pageId);
        await Page.findById(pageId).then( async (p) => {
            if (p) {
                console.log('base page ', p);
                const page = new Page({
                    name: p.name,
                    createdAt: new Date(),
                    type: p.type,
                    content : await duplicateContent(p.content, p.type),
                    permissions: p.permissions
                });
                console.log('new page ', page);
                const id = await page.save().then( saved => {
                    copiedPages.push(saved.id);
                    return saved.id;
                });
                return id;
            }
            return p;
        });
        console.log('page with id ', pageId, ' duplicated');
        return pageId;
    }));
    return copiedPages;
}

export default duplicatePages;


/*  Duplicates the content of a page, based on the contentID and type
*/
async function duplicateContent(contentId, pageType){
    let content;
    switch (pageType) {
        case 'workflow': {
            const w = await Workflow.findById(contentId);
            const steps = await duplicateSteps(w.steps);
            const workflow = new Workflow({
                name: w.name,
                createdAt: new Date(),
                steps,
            });
            console.log('new workflow ', workflow);
            await workflow.save();
            content = workflow._id;
            break;
        }
        case 'dashboard': {
            const d = await Dashboard.findById(contentId);
            const dashboard = new Dashboard({
                name: d.name,
                createdAt: new Date(),
                structure: d.structure,
            });
            console.log('new dashboard ', dashboard);
            await dashboard.save();
            content = dashboard._id;
            break;
        }
        case 'form': {
            const form = await Form.findById(contentId);
            if (!form) {
                throw new GraphQLError(errors.dataNotFound);
            }
            console.log('form ok');
            content = form._id;
            break;
        }
        default:
            break;
    }
    console.log('new content ', content);
    return content;
}


/*  Duplicates the step from a workflow. Will call duplicateContent for Step content
*/
async function duplicateSteps(steps){
  const copiedSteps = [];
  await Promise.all(steps.map( async step => {
    console.log('base step ', step);
    await Step.findById(step).then( async (s) => {
        if (s.type !== 'workflow') { //A step type should never be workflow, but if some error occurs, this condition will prevent recursion
            const step = new Step({
                name: s.name,
                createdAt: new Date(),
                type: s.type,
                content: await duplicateContent(s.content, s.type),
                permissions: s.permissions
            });
            console.log('new step ', step);
            const id = await step.save().then( saved => {
                copiedSteps.push(saved.id);
                return saved.id;
            });
            return id;
        }
        return s;
    })
    return step;}));
    return copiedSteps;
}
