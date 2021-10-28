import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { contentType } from '../../const/enumTypes';
import errors from '../../const/errors';
import { Application, Workflow, Dashboard, Form, Page, Role } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { PageType } from '../types';
import { ContentEnumType } from '../../const/enumTypes';


export default {
    /*  Creates a new page linked to an existing application.
        Creates also the linked Workflow or Dashboard. If it's a Form, the user must give its ID.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: PageType,
    args: {
        type: { type: new GraphQLNonNull(ContentEnumType) },
        content: { type: GraphQLID },
        application: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;
        if (!args.application || !(args.type in contentType)) {
            throw new GraphQLError(errors.invalidAddPageArguments);
        }
        const application = await Application.findById(args.application);
        let pageName = '';
        if (!application) throw new GraphQLError(errors.dataNotFound);
        if (ability.can('update', application)) {
            // Create the linked Workflow or Dashboard
            let content = args.content;
            switch (args.type) {
                case contentType.workflow: {
                    pageName = 'Workflow';
                    const workflow = new Workflow({
                        name: pageName,
                        createdAt: new Date(),
                    });
                    await workflow.save();
                    content = workflow._id;
                    break;
                }
                case contentType.dashboard: {
                    pageName = 'Dashboard';
                    const dashboard = new Dashboard({
                        name: pageName,
                        createdAt: new Date(),
                    });
                    await dashboard.save();
                    content = dashboard._id;
                    break;
                }
                case contentType.form: {
                    const form = await Form.findById(content);
                    if (!form) {
                        throw new GraphQLError(errors.dataNotFound);
                    }
                    pageName = form.name;
                    break;
                }
                default:
                    break;
            }
            // Create a new page.
            const roles = await Role.find({ application: application._id });
            const page = new Page({
                name: pageName,
                createdAt: new Date(),
                type: args.type,
                content,
                permissions: {
                    canSee: roles.map(x => x.id),
                    canUpdate: [],
                    canDelete: []
                }
            });
            await page.save();
            // Link the new page to the corresponding application by updating this application.
            const update = {
                modifiedAt: new Date(),
                $push: { pages: page.id },
            };
            await Application.findByIdAndUpdate(
                args.application,
                update,
            );
            return page;
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
};
