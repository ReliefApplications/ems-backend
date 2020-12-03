"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_1 = __importDefault(require("./middlewares/auth"));
const graphql_1 = __importDefault(require("./middlewares/graphql"));
const errors_1 = __importDefault(require("./const/errors"));
const apollo_server_express_1 = require("apollo-server-express");
const schema_1 = __importDefault(require("./schema/schema"));
const http_1 = require("http");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
if (process.env.DB_PREFIX === 'mongodb+srv') {
    mongoose_1.default.connect(`${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`, {
        useCreateIndex: true,
        useNewUrlParser: true,
        autoIndex: true
    });
}
else {
    mongoose_1.default.connect(`${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.APP_NAME}@`);
}
mongoose_1.default.connection.once('open', () => {
    console.log('connected to database');
});
/*  For CORS, ALLOWED-ORIGINS param of .env file should have a format like that:
    ALlOWED_ORIGINS="<origin-1>, <origin-2>"
    Ex:
    ALLOWED_ORIGINS="http://localhost:4200, http://localhost:3000"
*/
// eslint-disable-next-line no-undef
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(', ');
const PORT = 3000;
const app = express_1.default();
app.use(cors_1.default({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = errors_1.default.invalidCORS;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));
app.use(auth_1.default);
app.use('/graphql', graphql_1.default);
const apolloServer = new apollo_server_express_1.ApolloServer({
    schema: schema_1.default,
    subscriptions: {
        onConnect: (connectionParams, websocket) => {
            console.log('on connect');
        }
    },
    context: ({ req, connection }) => {
        if (connection) {
            return connection.context;
        }
        if (req) {
            return {
                user: req.user
            };
        }
    }
});
apolloServer.applyMiddleware({
    app
});
const httpServer = http_1.createServer(app);
apolloServer.installSubscriptionHandlers(httpServer);
httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${apolloServer.graphqlPath}`);
    console.log(`🚀 Server ready at ws://localhost:${PORT}${apolloServer.subscriptionsPath}`);
});
//# sourceMappingURL=app.js.map