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
         const mySkillsCollection = client.db('NexenCarParts').collection('MySkills');
         const myToolsCollection = client.db('NexenCarParts').collection('MyTools');
         const myProjectsCollection = client.db('NexenCarParts').collection('MyProjects');


         // Verify Admin 
        const verifyAdmin =  async(req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({email: requester});
  
            if (requesterAccount.role == 'admin') {
              next();
            }
            else{
              return res.status(403).send({message: 'Forbidden Access!'});
            }
        };


        // check admin or not 
        app.get('/admin/:email', async (req, res) => {
        const email = req.params.email;
        const user = await usersCollection.findOne({email: email});
        const isAdmin = user.role === 'admin';
        res.send({admin: isAdmin});
        });

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


        // Parts or Item Delete by id
        app.delete('/parts/delete/:id', verifyToken, verifyAdmin, async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await partsCollection.deleteOne(query);
            res.send(result);
        } );


        // Parts or Product Add 
        app.post('/add-product', verifyToken, verifyAdmin, async(req, res) => {
            const product = req.body;
            const result = await partsCollection.insertOne(product);
            res.send(result);
        } );



        // Reviews get
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewsCollection.find().toArray();
            res.send(reviews);
        });


        // Reviews Add 
        app.post('/add-review', verifyToken, async(req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.send(result);
        } );


        // Order post 
        app.post('/order', verifyToken, async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        });

        // Order update with payment 
        app.patch('/order/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updateDocument = {
              $set: {
                paid: true,
                transactionId: payment.transactionId
              }
            };
            const result = await paymentsCollection.insertOne(payment);
            const updatedOrder = await ordersCollection.updateOne(filter, updateDocument);
            res.send(updateDocument);
        });


        // Order update with approved status 
        app.patch('/order/approve/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const approveData = req.body;
            const filter = {_id: ObjectId(id)};
            const updateDocument = {
              $set: {...approveData}
            };
            const updatedOrder = await ordersCollection.updateOne(filter, updateDocument);
            res.send(approveData);
        });


        // Order Delete 
        app.delete('/order/delete/:id', verifyToken, async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const order = await ordersCollection.findOne(query);

            // If the not paid then delete 
            if(!order.paid) {
                const result = await ordersCollection.deleteOne(query);
                res.send(result);
            }
 
        } );


        // all user get 
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });

        // make user admin 
        app.put('/user/admin/:email', verifyToken, verifyAdmin, async(req, res) => {
            const email = req.params.email;
            const filter = {email: email};
            const updateDocument = {
                $set: {role: 'admin'},
            };
            const result = await usersCollection.updateOne(filter, updateDocument);
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

        // Get Orders All orders for admin
        app.get('/all-orders', verifyToken, verifyAdmin, async (req, res) => {
            const orders = await ordersCollection.find().toArray();
            res.send(orders);
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


        // get user info
        app.get('/user-info/:email', verifyToken, async(req, res) => {
            const email = req.params.email;
            const filter = {email: email};
            const userInfo = await usersCollection.findOne(filter);
            res.send(userInfo);
        });


        // Update Parts quantity 
        app.patch('/parts/update/:id', verifyToken, async (req, res) => {
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
        app.post('/create-payment-intent', verifyToken, async (req, res) => {
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


        // my skills get
        app.get('/skills', async (req, res) => {
            const skills = await mySkillsCollection.find().toArray();
            res.send(skills);
        });

        // my tools get
        app.get('/tools', async (req, res) => {
            const tools = await myToolsCollection.find().toArray();
            res.send(tools);
        });

        // my projects get
        app.get('/projects', async (req, res) => {
            const projects = await myProjectsCollection.find().toArray();
            res.send(projects);
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