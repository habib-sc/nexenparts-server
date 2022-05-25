const express = require('express');
const cors = require('cors');
const res = require('express/lib/response');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

const app = express();

// Middlewear 
app.use(cors());
app.use(express.json());

// Root Endpoint 
app.get('/', (req, res) => {
    res.send('Manufacturer');
});


// Token verify middlewear 
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
  
    if(!authHeader){
      return res.status(401).send({message: 'Unauthorized Access!'});
    }
  
    const token = authHeader?.split(' ')[1];
    jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
      if(err){
        return res.status(403).send({message: 'Forbidden Access!'});
      }
      req.decoded = decoded;
      next();
    });
};


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
         const usersCollection = client.db('NexenCarParts').collection('Users');
         const paymentsCollection = client.db('NexenCarParts').collection('Payments');

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

        // Get Orders by user
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;  
            const decodedEmail = req.decoded.email;
            
            if(email == decodedEmail) {
                const query = {email: email};
                const orders = await ordersCollection.find(query).toArray();
                res.send(orders);
            }
            else{
                return res.status(403).send({message: 'Forbidden Access'});
            }
            
        });


        // Get Order by id 
        app.get('/order/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await ordersCollection.findOne(query);
            res.send(result);
        });

        // Upsert users and issue token 
        app.put('/user/:email', async(req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = {email: email};
            const options = { upsert: true};
            const updateDocument = {
                $set: {...user},
            };
            const result = await usersCollection.updateOne(filter, updateDocument, options);
            const token = jwt.sign({email: email}, process.env.TOKEN_SECRET, {expiresIn: '1d' });
            res.send({result, token});
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


        // Payment intent api 
        app.post('/create-payment-intent', async (req, res) => {
            const order = req.body;
            const price = order.totalPrice;
            const amount = price*100;

            if(amount){
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: 'usd',
                    payment_method_types: ['card']
                });
                res.send({clientSecret: paymentIntent.client_secret})
            }
            else{
                res.send({success: false});
            }
            
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