const MongoClient = require('mongodb').MongoClient;

class Connection {
    static connectToMongo() {
        if ( this.db ) return Promise.resolve(this.db);
        return MongoClient.connect(this.url, this.options)
            .then(db => {
                let collection = db.db('contextManager').collection('resources');
                collection.createIndex('name', {unique: true}, ()=> this.db = db.db('contextManager'));
            })
    }
}

Connection.db = null;
Connection.url = 'mongodb://127.0.0.1:27017/contextManager';
Connection.options = {
    bufferMaxEntries:   0,
    reconnectTries:     5000,
    useNewUrlParser: true
};

module.exports = { Connection };