const mongoose = require('mongoose');

const db = mongoose.connect("mongodb+srv://admin:admin@123@cluster0.n7mmkej.mongodb.net/oort_dev?retryWrites=true&w=majority", {
    useCreateIndex: true,
    useNewUrlParser: true,
    autoIndex: true,
    autoReconnect: true,
    reconnectInterval: 5000,
    reconnectTries: 3,
    poolSize: 10,
});

module.exports = db;