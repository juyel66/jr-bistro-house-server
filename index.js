const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.Stripe_Secret_Kay)
const port = process.env.PORT || 5000;

//bed273fce0e18a1a1eca3492a3133d5907a2483f3447948c85217c5794b1f400958f7c4e4a94d9525f0bfa61978896c8774ffd49598482e7a6afe42e4bf52d09

// middleware 
app.use(cors({
  origin: [
    'http://localhost:5173'
  ],
}));
app.use(express.json());




const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@juyel.zm7wayi.mongodb.net/?retryWrites=true&w=majority&appName=JUYEL`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const menuCollections = client.db('bistroDB').collection('menu');
    const UsersCollections = client.db('bistroDB').collection('users');
    const reviewsCollections = client.db('bistroDB').collection('reviews');
    const CartCollections = client.db('bistroDB').collection('carts');
    const paymentsCollections = client.db('bistroDB').collection('payments');


    // middleWare 
    const verifyToken = (req, res, next)=>{
      console.log('inside verify token', req.headers.authorization)
      if(!req.headers.authorization){
        return res.status(401).send({message: 'unauthorized access'});
      }
      const token = req.headers.authorization.split(' ')[1];
     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if(err){
        return res.status(401).send({message: 'unauthorized access'})
      }
      req.decoded = decoded;
      next();
     })

    }

    // use verify admin after  verify token
    const verifyAdmin = async(req, res,next ) =>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await UsersCollections.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next();
    }

    // jwt related api 
    app.post('/jwt', async(req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });
      res.send({token});
    })

    // users related API 
    app.post('/users', async(req, res) =>{
      const user = req.body;
      //insert email if user dose not exists:
      // you can do this many ways (1,  email unique, 2. upsert 3, simple checking)
      const  query = {email: user.email}
      const existingUser = await UsersCollections.findOne(query);
      if(existingUser){
        return res.send ({message: 'user already existing', insertedId: null})
      }
      const result = await UsersCollections.insertOne(user);
      res.send(result)  
    })



    app.get('/users',verifyToken, verifyAdmin, async(req, res) => {
     
      const result = await UsersCollections.find().toArray();
      res.send(result);
    });




    app.delete('/users/:id',verifyToken, verifyAdmin,async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await UsersCollections.deleteOne(query);
      res.send(result);
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin,async(req, res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await UsersCollections.updateOne(filter,updatedDoc);
      res.send(result);

    })

    app.get('/users/admin/:email',verifyToken, async(req, res) => {
      const email  = req.params.email;
      if(email !==req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const query = {email: email}; 
      const user = await UsersCollections.findOne(query)
      let admin = false;
      if(user){
        admin = user?.role === 'admin';
      }
      res.send({admin});
    })


    // cart collection 
    app.post('/carts', async(req,res)=>{
      const cartItem = req.body;
      console.log(cartItem);
      const result = await CartCollections.insertOne(cartItem);
      res.send(result);
    })

    app.get('/carts', async(req, res) =>{
      const email = req.query.email;
      console.log(email)
      const query =  {email: email };
      const result = await CartCollections.find(query).toArray();
      res.send(result);
    })

    app.delete('/carts/:id', async(req, res)=>{
      const id = req.params.id;
      const query  = {_id: new ObjectId(id)}
      const result = await CartCollections.deleteOne(query);
      res.send(result)
    })
    // payment intent
    app.post('/create-payment-intent', async(req,res) =>{
      const {price} = req.body;
      const amount = parseInt(price * 100);
      console.log(amount,'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    }) 

    app.post('/payments', async(req, res) =>{
      const payment = req.body;
      const paymentResult = await paymentsCollections.insertOne(payment);

      // carefully delete each item from the cart 
      console.log('payment info', payment);
      const query ={_id: {
        $in: payment.cartIds.map(id => new ObjectId(id))
      }};
      const deleteResult = await CartCollections.deleteMany(query)
      res.send({paymentResult, deleteResult});
    })
    app.get('/payments/:email',verifyToken, async(req,res)=>{
      const query = {email: req.params.email}
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const result = await paymentsCollections.find(query).toArray();
      res.send(result);
    })

    app.get('/menu', async(req, res)=>{
        const result = await menuCollections.find().toArray();
        res.send(result);
    })
    app.post('/menu',verifyToken,verifyAdmin, async(req, res)=>{
      const item = req.body;
      const result = await menuCollections.insertOne(item);
      res.send(result);
    })
    app.delete('/menu/:id', verifyToken, verifyAdmin, async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await menuCollections.deleteOne(query);
      res.send(result)
    })
    app.get('/menu/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await menuCollections.findOne(query);
      res.send(result);
    })
    app.patch('/menu/:id', async(req, res) =>{
      const item = req.body;
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
      }
      const result = await menuCollections.updateOne(filter, updatedDoc);
      res.send(result);
    })


    app.get('/reviews', async(req, res)=>{
        const result = await reviewsCollections.find().toArray();
        res.send(result);
    })



    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('JR Bistro House server is running')
})

app.listen(port,() => {
console.log(`JR Bistro House running on port: ${port}`)
})
