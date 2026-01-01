require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const app = express();
const port = process.env.PORT || 3000;


// Middleware
app.use(cors());
app.use(express.json());

// Email transporter setup (Gmail example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address
    pass: process.env.EMAIL_PASS  // Gmail app password (not regular password)
  }
});

// Function to send reminder email
async function sendReminderEmail(item) {
  const isLender = item.category === 'lent';
  const subject = isLender 
    ? `${item.person} এর থেকে টাকা ফেরত নিন` 
    : `${item.person} কে টাকা ফেরত দিন`;
  
  const message = isLender
    ? `প্রিয় Reenian,\n\n${item.person} এর কাছ থেকে ৳${item.amount} টাকা ফেরত পাওয়ার তারিখ ছিল (${item.dueDate})।\n\nপ্রয়োজনে তাকে মনে করিয়ে দিন। আর টাকা ফেরত পেয়ে থাকলে Reeni অ্যাপ-এ স্ট্যাটাস আপডেট করে দিন "ফেরত পেয়েছি"।\n\n- Reeni - Reminder`
    : `প্রিয় Reenian,\n\n${item.person} কে ৳${item.amount} টাকা ফেরত দেওয়ার তারিখ ছিল (${item.dueDate})।\n\nঅনুগ্রহ করে আজই ফেরত দিন। আর ইতিমধ্যে ফেরত দিয়ে থাকলে Reeni অ্যাপ-এ স্ট্যাটাস আপডেট করে দিন "ফেরত দিয়েছি"।\n\n- Reeni - Reminder`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: item.email,
    subject: subject,
    text: message
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to ${item.email} for item: ${item.person}`);
    return true;
  } catch (err) {
    console.error(`Failed to send email to ${item.email}:`, err.message);
    return false;
  }
}

// Function to check overdue items and send reminders
async function checkOverdueAndSendReminders() {
  if (!newitemsCollections) {
    console.log('DB not connected, skipping overdue check');
    return;
  }

  // Use Dhaka local date so checks align with the cron timezone
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }); // YYYY-MM-DD

  try {
    // Find items where:
    // - dueDate is today or earlier (send on due day)
    // - returned is false
    // - has an email address
    const overdueItems = await newitemsCollections.find({
      dueDate: { $lte: today },
      returned: false,
      email: { $exists: true, $ne: '' }
    }).toArray();

    console.log(`Found ${overdueItems.length} overdue items (due today or earlier) to process`);

    for (const item of overdueItems) {
      try {
        // Prevent sending more than once per day: if reminderSentAt exists and is today (Asia/Dhaka), skip
        if (item.reminderSentAt) {
          const lastSentDate = new Date(item.reminderSentAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
          if (lastSentDate === today) {
            console.log(`Skipping ${item._id} — already sent today (${today})`);
            continue;
          }
        }

        const sent = await sendReminderEmail(item);
        if (sent) {
          // Record that a reminder was sent now; do NOT set a permanent "reminderSent" flag so reminders continue until returned
          await newitemsCollections.updateOne(
            { _id: item._id },
            { $set: { reminderSentAt: new Date() }, $inc: { reminderCount: 1 } }
          );
        }
      } catch (innerErr) {
        console.error(`Error processing item ${item._id}:`, innerErr?.message || innerErr);
      }
    }
  } catch (err) {
    console.error('Error checking overdue items:', err.message);
  }
}

// Schedule cron job - runs every day at 9:00 AM
cron.schedule('0 9 * * *', () => {
  console.log('Running daily overdue check at 9 AM...');
  checkOverdueAndSendReminders();
}, {
  timezone: 'Asia/Dhaka' // Bangladesh timezone
});

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
    // Connect the client to the server (commented for Vercel serverless)
    // await client.connect();

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

// get api - fetch all items for a user
app.get('/new-list', async (req,res)=>{
    try {
      const col = getCollectionOrError(res);
      if (!col) return;
      
      const userId = req.query.userId;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      const userItems = await col.find({ userId: userId }).toArray();
      res.send(userItems);
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

// get all history for a user
app.get('/history', async (req, res) => {
  try {
    const col = getHistoryCollectionOrError(res);
    if (!col) return;
    
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const userHistory = await col.find({ userId: userId }).toArray();
    res.send(userHistory);
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

// Manually trigger overdue check (for testing)
app.post('/check-overdue', async (req, res) => {
  try {
    await checkOverdueAndSendReminders();
    res.json({ message: 'Overdue check completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test email endpoint (for testing email setup)
app.post('/test-email', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: '✅ Reeni App - Email Test',
      text: 'যদি আপনি এই ইমেইল পান, তাহলে আপনার ইমেইল সেটআপ সঠিকভাবে কাজ করছে!\n\n- Reeni App'
    });
    res.json({ message: `Test email sent to ${email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.listen(port,(()=>{
    console.log(`Server is running on port ${port}`);
}))

