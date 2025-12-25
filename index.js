require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
let historyCollection;

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    newitemsCollections = client.db('reeniDB').collection('newitems');
    historyCollection = client.db('reeniDB').collection('history');
    console.log('Connected to MongoDB!');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }
}
run().catch(console.dir);

// helper to ensure collection is ready
function getCollectionOrError(res) {
  if (!newitemsCollections) {
    const msg = 'Database not connected yet';
    console.error(msg);
    res.status(503).json({ error: msg });
    return null;
  }
  return newitemsCollections;
}

function getHistoryCollectionOrError(res) {
  if (!historyCollection) {
    const msg = 'Database not connected yet';
    console.error(msg);
    res.status(503).json({ error: msg });
    return null;
  }
  return historyCollection;
}

// helper to validate ObjectId format
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// post api
app.post('/new-list', async (req,res)=>{
    try {
      const col = getCollectionOrError(res);
      if (!col) return;
      const newLIst = req.body;
      const results = await col.insertOne(newLIst);
      res.send(results);
    } catch (err) {
      console.error('POST /new-list error:', err);
      res.status(500).send({ error: err.message });
    }
})

// delete api
app.delete('/new-list/:id', async(req,res)=>{
  try {
    const col = getCollectionOrError(res);
    if (!col) return;
    const id = req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    const query = { _id: new ObjectId(id) };
    const result = await col.deleteOne(query);
    res.send(result);
  } catch (err) {
    console.error('DELETE /new-list/:id error:', err);
    res.status(500).json({ error: err.message });
  }
})

// update api
app.put('/new-list/:id', async (req, res) => {
  try {
    const col = getCollectionOrError(res);
    if (!col) return;
    const id = req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $set: req.body };
    const result = await col.updateOne(query, updateDoc, { upsert: false });
    res.send(result);
  } catch (err) {
    console.error('PUT /new-list/:id error:', err);
    res.status(500).json({ error: err.message });
  }
})

// get api - fetch all items
app.get('/new-list', async (req,res)=>{
    try {
      const col = getCollectionOrError(res);
      if (!col) return;
      const allItems = await col.find({}).toArray();
      res.send(allItems);
    } catch (err) {
      console.error('GET /new-list error:', err);
      res.status(500).send({ error: err.message });
    }
})

// history apis

// post history
app.post('/history', async (req, res) => {
  try {
    const col = getHistoryCollectionOrError(res);
    if (!col) return;
    const historyItem = req.body;
    const result = await col.insertOne(historyItem);
    res.send(result);
  } catch (err) {
    console.error('POST /history error:', err);
    res.status(500).send({ error: err.message });
  }
});

// get all history
app.get('/history', async (req, res) => {
  try {
    const col = getHistoryCollectionOrError(res);
    if (!col) return;
    const allHistory = await col.find({}).toArray();
    res.send(allHistory);
  } catch (err) {
    console.error('GET /history error:', err);
    res.status(500).send({ error: err.message });
  }
});

// delete history item
app.delete('/history/:id', async (req, res) => {
  try {
    const col = getHistoryCollectionOrError(res);
    if (!col) return;
    const id = req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    const query = { _id: new ObjectId(id) };
    const result = await col.deleteOne(query);
    res.send(result);
  } catch (err) {
    console.error('DELETE /history/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});



app.get('/', (req, res) => {
    res.send('Hello World!');
})


app.listen(port,(()=>{
    console.log(`Server is running on port ${port}`);
}))

