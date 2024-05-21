const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
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
    const reviewsCollections = client.db('bistroDB').collection('reviews');
    const CartCollections = client.db('bistroDB').collection('carts');


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

    app.get('/menu', async(req, res)=>{
        const result = await menuCollections.find().toArray();
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
