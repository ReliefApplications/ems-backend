const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const authMiddleware = require('./middlewares/auth');
const graphqlMiddleware = require('./middlewares/graphql');
const errors = require('./const/errors');
const { ApolloServer } = require('apollo-server-express');
const schema = require('./schema/schema');

require('dotenv').config();

if (process.env.DB_PREFIX === 'mongodb+srv') {
    mongoose.connect(
        `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`, {
            useCreateIndex: true,
            useNewUrlParser: true,
            autoIndex: true
        });
} else {
    mongoose.connect(`${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.APP_NAME}@`);
}

mongoose.connection.once('open', () => {
    console.log('connected to database');
});

/*  For CORS, ALLOWED-ORIGINS param of .env file should have a format like that:
    ALlOWED_ORIGINS="<origin-1>, <origin-2>"
    Ex:
    ALLOWED_ORIGINS="http://localhost:4200, http://localhost:3000"
*/
// eslint-disable-next-line no-undef
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(', ');

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = errors.invalidCORS;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));

app.use(authMiddleware);
app.use('/graphql', graphqlMiddleware);

const apolloServer = new ApolloServer({
    schema,
    context: ({ req }) => ({
        user: req.user
    })
});
  
apolloServer.applyMiddleware({
    app
});

app.listen({ port: 3000 }, () => {
    console.log('Listening on port 3000');
});