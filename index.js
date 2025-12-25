require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;


// Middleware
app.use(cors());
app.use(express.json());

// mongodb


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wld9ndi.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let newitemsCollections;

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    newitemsCollections = client.db('reeniDB').collection('newitems');
    console.log('Connected to MongoDB!');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }
}
run().catch(console.dir);

// post api
app.post('/new-list', async (req,res)=>{
    try {
      const newLIst = req.body;
      const results = await newitemsCollections.insertOne(newLIst)
      res.send(results)
    } catch (err) {
      res.status(500).send({ error: err.message })
    }
})

// delete api
app.delete('/new-list/:id', async(req,res)=>{
  const id = req.params.id;
  const query = { _id: new MongoClient.ObjectId(id) };
  const result = await newitemsCollections.deleteOne(query);
  res.send(result);
})

// get api - fetch all items
app.get('/new-list', async (req,res)=>{
    try {
      const allItems = await newitemsCollections.find({}).toArray();
      res.send(allItems);
    } catch (err) {
      res.status(500).send({ error: err.message })
    }
})



app.get('/', (req, res) => {
    res.send('Hello World!');
})


app.listen(port,(()=>{
    console.log(`Server is running on port ${port}`);
}))

