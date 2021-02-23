// import applyFilters from './applyFilters';

import { GraphQLError } from "graphql";
import errors from "../../../const/errors";
import { Form, Record } from "../../../models";
import convertFilter from "../../convertFilter";
import getFilter from "./getFilter";
import getSortField from "./getSortField";
import { AbilityBuilder, Ability, InferSubjects, AbilityClass } from '@casl/ability';
import mongoose from 'mongoose';

export type AppAbility = Ability<[Actions, Subjects]>;
export type Actions = 'create' | 'read' | 'update' | 'delete';
type Models = Record;
export type Subjects = InferSubjects<Models>;
const AppAbility = Ability as AbilityClass<AppAbility>;

export default (id) => async (
    _,
    { sortField, sortOrder = 'asc', page = 0, perPage = 25, filter = {} },
    context
) => {

    const user = context.user;
    if (!user) {
        throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = user.ability;

    const mongooseFilter = getFilter(filter);

    Object.assign(mongooseFilter,
        { $or: [{ resource: id }, { form: id }] }
    );



    // if (!ability.can('read', 'Record')) {
    //     form.permissions.canQuery.forEach(x => {
    //         Object.assign(mongooseFilter,
    //             convertFilter(x.access, Record, user)
    //         );
    //     });
    // }
    /* Example of test filters:
    role: admin
    access: everything -> can acess all records where id is defined by the top

    role: coordinator
    access: everuthing part of same country ( based on creator )

    role: partner
    access: everything part of same country + same agency ( based on creator )

    */
    const form = await Form.findById(id);
    const { can, cannot, rules } = new AbilityBuilder(AppAbility);
    // can('read', 'Record',)

    const roles = user.roles.map(x => mongoose.Types.ObjectId(x._id));

    form.permissions.canQuery.forEach(x => {
        can('read', 'Record', { createdBy: user });
        //         Object.assign(mongooseFilter,
        //             convertFilter(x.access, Record, user)
        //         );
        //     });
    });

    const formAbility = new Ability(rules);

    return Record.accessibleBy(formAbility).find(mongooseFilter)
        .sort([[getSortField(sortField), sortOrder]])
        .skip(page * perPage)
        .limit(perPage);
};