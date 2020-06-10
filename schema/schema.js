const graphql = require('graphql');
const Country = require('../models/country');
const Incident = require('../models/incident');
const Task = require('../models/task');

const { 
    GraphQLObjectType, GraphQLString, 
    GraphQLID, GraphQLInt,GraphQLSchema, 
    GraphQLList,GraphQLNonNull
} = graphql;

//Schema defines data on the Graph like object types(book type), relation between 
//these object types and describes how it can reach into the graph to interact with 
//the data to retrieve or mutate the data   

const TaskType = new GraphQLObjectType({
    name: 'Task',
    //We are wrapping fields in the function as we dont want to execute this ultil 
    //everything is inilized. For example below code will throw error AuthorType not 
    //found if not wrapped in a function
    fields: () => ({
        id: { type: GraphQLID  },
        name: { type: GraphQLString }, 
        incident: {
            type: IncidentType,
            resolve(parent, args) {
                return Incident.findById(parent.incidentID);
            }
        },
        country: {
            type: CountryType,
            resolve(parent, args) {
                return Country.findById(parent.countryID);
            }
        },
        createdAt: { type: GraphQLString },
    })
});

const IncidentType = new GraphQLObjectType({
    name: 'Incident',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        tasks:{
            type: new GraphQLList(TaskType),
            resolve(parent, args) {
                return Task.find({ incidentID: parent.id });
            }
        }
    })
})

const CountryType = new GraphQLObjectType({
    name: 'Country',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString},
        tasks: {
            type: new GraphQLList(TaskType),
            resolve(parent, args) {
                return Task.find({ countryID: parent.id});
            }
        }
    })
})

//RootQuery describe how users can use the graph and grab data.
//E.g Root query to get all authors, get all books, get a particular 
//book or get a particular author.
const RootQuery = new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
        task: {
            type: TaskType,
            //argument passed by the user while making the query
            args: { id: { type: GraphQLID } },
            resolve(parent, args) {
                //Here we define how to get data from database source

                //this will return the book with id passed in argument 
                //by the user
                return Task.findById(args.id);
            }
        },
        tasks:{
            type: new GraphQLList(TaskType),
            resolve(parent, args) {
                return Task.find({});
            }
        },
        incident:{
            type: IncidentType,
            args: { id: { type: GraphQLID } },
            resolve(parent, args) {
                return Incident.findById(args.id);
            }
        },
        incidents:{
            type: new GraphQLList(IncidentType),
            resolve(parent, args) {
                return Incident.find({});
            }
        },
        country:{
            type: CountryType,
            args: { id: { type: GraphQLID } },
            resolve(parent, args) {
                return Country.findById(args.id);
            }
        },
        countries:{
            type: new GraphQLList(CountryType),
            resolve(parent, args) {
                return Country.find({});
            }
        },
    }
});
 
//Very similar to RootQuery helps user to add/update to the database.
const Mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        addIncident: {
            type: IncidentType,
            args: {
                //GraphQLNonNull make these field required
                name: { type: new GraphQLNonNull(GraphQLString) }
            },
            resolve(parent, args) {
                let incident = new Incident({
                    name: args.name,
                    createdAt: new Date()
                });
                return incident.save();
            }
        },
        addCountry: {
            type: CountryType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) }
            },
            resolve(parent, args) {
                let country = new Country({
                    name: args.name
                });
                return country.save();
            }
        },
        addTask: {
            type: TaskType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString)},
                incidentID: { type: new GraphQLNonNull(GraphQLID)},
                countryID: { type: GraphQLID}
            },
            resolve(parent, args) {
                let task = new Task({
                    name: args.name,
                    incidentID: args.incidentID,
                    countryID: args.countryID,
                    createdAt: new Date()
                });
                return task.save();
            }
        }
    }
});

//Creating a new GraphQL Schema, with options query which defines query 
//we will allow users to use when they are making request.
module.exports = new GraphQLSchema({
    query: RootQuery,
    mutation:Mutation
});