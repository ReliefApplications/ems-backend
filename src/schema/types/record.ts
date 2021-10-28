import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean, GraphQLList } from 'graphql';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';
import GraphQLJSON from 'graphql-type-json';
import { FormType, UserType, VersionType } from '.';
import { Form, Resource, Record, Version, User } from '../../models';

export const RecordType = new GraphQLObjectType({
    name: 'Record',
    fields: () => ({
        id: { type: GraphQLID },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        archived: { type: GraphQLBoolean },
        form: {
            type: FormType,
            async resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                const form = await Form.findOne(Form.accessibleBy(ability).where({ _id: parent.form }).getFilter());
                if (!form) {
                    // If user is admin and can see parent application, it has access to it
                    if (context.user.isAdmin && await canAccessContent(parent.form, 'read', ability)) {
                        return Form.findById(parent.form);
                    }
                } else {
                    return form;
                }
            },
        },
        data: {
            type: GraphQLJSON,
            args: {
                display: { type: GraphQLBoolean },
            },
            async resolve(parent, args) {
                if (args.display) {
                    const source = parent.resource ? await Resource.findById(parent.resource) : await Form.findById(parent.form);
                    const res = {};
                    if (source) {
                        for (const field of source.fields) {
                            const name = field.name;
                            if (parent.data[name]) {
                                res[name] = parent.data[name];
                                if (field.resource && field.displayField) {
                                    try {
                                        const record = await Record.findOne({ _id: parent.data[name], archived: { $ne: true } });
                                        res[name] = record.data[field.displayField];
                                    } catch {
                                        res[name] = null;
                                    }
                                } else {
                                    res[name] = parent.data[name];
                                }
                            } else {
                                res[name] = null;
                            }
                        }
                        return res;
                    } else {
                        return parent.data;
                    }
                } else {
                    return parent.data;
                }
            },
        },
        versions: {
            type: new GraphQLList(VersionType),
            resolve(parent) {
                return Version.find().where('_id').in(parent.versions);
            },
        },
        createdBy: {
            type: UserType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return User.findById(parent.createdBy.user).accessibleBy(ability, 'read');
            },
        },
        modifiedBy: {
            type: UserType,
            async resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                let lastVersionAuthorId: any;
                try {
                    const lastVersion = await Version.find().where('_id').in(parent.versions).sort({"createdAt": -1}).limit(1);
                    // if no version yet, the last modifier is the creator
                    if(lastVersion.length === 0) {
                        lastVersionAuthorId = parent.createdBy.user;
                    }
                    else {
                        lastVersionAuthorId = lastVersion[0].createdBy;
                    }
                }
                catch (e) {
                    const u = new User();
                    u.name = 'unkown';
                    return u;
                }
                return User.findById(lastVersionAuthorId).accessibleBy(ability, 'read');
            }
        }
    }),
});
