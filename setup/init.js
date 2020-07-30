const mongoose = require('mongoose');
const Permission = require('../models/permission');
const Role = require('../models/role');

require('dotenv').config();

// eslint-disable-next-line no-undef
mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`);

mongoose.connection.once('open', async () => {
    try {
        const permissionTypes = [
            'can_see_roles',
            'can_see_forms',
            'can_see_resources',
            'can_see_users',
            'can_manage_dashboards',
            'can_manage_forms',
            'can_manage_resources'
        ];
        for (const type of permissionTypes) {
            let permission = new Permission({
                type: type
            });
            await permission.save();
            console.log(`${type} permission created`);
        }
    
        let role = new Role({
            title: 'admin',
            permissions: await Permission.find().distinct('_id')
        });
    
        await role.save();
        console.log('admin role created');
    } catch (err) {
        console.log(err);
    }

    mongoose.connection.close(() => {
        console.log('connection closed');
    });
});
