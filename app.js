const express = require('express');
const graphqlHTTP = require('express-graphql');
const schema = require('./schema/schema')
const app = express();

const mongoose = require('mongoose');


mongoose.connect('mongodb+srv://root:dD4567891@cluster0-w03ly.mongodb.net/test?retryWrites=true&w=majority')

mongoose.connection.once('open', () => {
    console.log('conneted to database');
});

//This route will be used as an endpoint to interact with Graphql, 
//All queries will go through this route. 
app.use('/graphql', graphqlHTTP({
    //Directing express-graphql to use this schema to map out the graph 
    schema,
    //Directing express-graphql to use graphiql when goto '/graphql' address in the browser
    //which provides an interface to make GraphQl queries
    graphiql:true
}));

app.listen(3000, () => {
    console.log('Listening on port 3000');
}); 