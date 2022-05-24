const express = require('express');
const cors = require('cors');
const res = require('express/lib/response');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();

// Middlewear 
app.use(cors());
app.use(express.json());

// Root Endpoint 
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
         const reviewsCollection = client.db('NexenCarParts').collection('Reviews');
         const ordersCollection = client.db('NexenCarParts').collection('Orders');

        // Parts get
        app.get('/parts', async (req, res) => {
            const parts = await partsCollection.find().toArray();
            res.send(parts);
        });

        // Parts get by id
        app.get('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const result = await partsCollection.findOne(filter);
            res.send(result);
        });

        // Reviews get
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewsCollection.find().toArray();
            res.send(reviews);
        });


        // Order post 
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        });

        // Update Parts quantity 
        app.patch('/parts/update/:id', async (req, res) => {
            const id = req.params.id;
            const quantity = req.body;
            const filter = {_id: ObjectId(id)};
            const updateDocument = {
              $set: quantity
            };
            const updatedItem = await partsCollection.updateOne(filter, updateDocument);
            res.send(updatedItem);
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