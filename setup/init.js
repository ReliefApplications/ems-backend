const mongoose = require('mongoose');
const {Permission} = require('../models/permission');
const {Role} = require('../models/role');

require('dotenv').config();

// eslint-disable-next-line no-undef
if (process.env.DB_PREFIX === 'mongodb+srv') {
    mongoose.connect(`${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`);
} else {
    mongoose.connect(`${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.APP_NAME}@`);
}
mongoose.connection.once('open', async () => {
    try {
        const globalPermissions = [
            'can_see_roles',
            'can_see_forms',
            'can_see_resources',
            'can_see_users',
            'can_see_applications',
            'can_manage_forms',
            'can_manage_resources',
            'can_manage_applications'
        ];
        for (const type of globalPermissions) {
            let permission = new Permission({
                type: type,
                global: true
            });
            await permission.save();
            console.log(`${type} global permission created`);
        }
        const appPermissions = [
            'can_see_roles',
            'can_see_users',
        ];
        for (const type of appPermissions) {
            let permission = new Permission({
                type: type,
                global: false
            });
            await permission.save();
            console.log(`${type} application's permission created`);
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
