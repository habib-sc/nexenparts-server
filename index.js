const express = require('express');
const cors = require('cors');
const res = require('express/lib/response');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();

// Middlewear 
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Manufacturer');
});


// DB Info 
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@nexencarparts.gzk5v.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run () {
    try {
         // Connecting db 
         await client.connect();
         const partsCollection = client.db('NexenCarParts').collection('Parts');

        // Parts get
        app.get('/parts', async (req, res) => {
            const parts = await partsCollection.find().toArray();
            res.send(parts);
        });
        
    }
    finally{

    }
}
run().catch(console.dir);

// listening server 
app.listen(port, () => {
    console.log('Manufacturer running on port', port);
});