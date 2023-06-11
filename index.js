const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config();

//middle ware
app.use(express.json())
app.use(cors())
const verifyJWT = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorized access' })
  }
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.DB_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: 'Unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
  // console.log(authorization)
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-euh9qdo-shard-00-00.hbyxuz9.mongodb.net:27017,ac-euh9qdo-shard-00-01.hbyxuz9.mongodb.net:27017,ac-euh9qdo-shard-00-02.hbyxuz9.mongodb.net:27017/?ssl=true&replicaSet=atlas-ny4qda-shard-0&authSource=admin&retryWrites=true&w=majority`;

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
    await client.connect();

    // instructor collection
    const instructorsCollection = client.db("campDB").collection("instructors");
    const usersCollection = client.db("campDB").collection("users");
    const classesCollection = client.db("campDB").collection("classes");


    // jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.DB_ACCESS_TOKEN, { expiresIn: '7d' });
      res.send({ token })
    })


    // get instructors
    app.get('/instructors', async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result)
    })


    // post users
    // eta ekhon lagbe na
    // app.post('/users', verifyJWT, async (req, res) => {
    //   const user = req.body;
    //   // console.log(user)
    //   const query = { email: user?.email }
    //   const decodedUser=req.decoded.user;
    //   console.log(decodedUser)
    //   if(user !==decodedUser){
    //     return res.status(403).send({ error: true, message: 'Forbidden access' })
    //   }
    //   // console.log(query)
    //   const existingUser = await usersCollection.findOne(query);
    //   if (existingUser) {
    //     return res.send({ message: 'user already exists' })
    //   }
    //   const result = await usersCollection.insertOne(user)
    //   res.send(result)
    // })


    // post users
    // uporer ta kaj na korle eta rekhe dibo
    app.post('/users', async (req, res) => {
      const user = req.body;
      // console.log(user)
      const query = { email: user?.email }
      // console.log(query)
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })


    // get users
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })



    // admin patch
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    // instructor patch
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    // admin email get
    // verifyjwt kaj na korle soray dibo
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      // console.log("140",email)
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      // console.log("144",req.decoded.email)
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result)
    })


    // instructor email get
    // verifyjwt kaj na korle soray dibo
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result)
    })





    // post classes
    app.post('/classes', async (req, res) => {
      const classes = req.body;
      const result = await classesCollection.insertOne(classes);
      res.send(result)
    })


    //  for status changed done
    app.patch('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: 'Approve'
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    //  for status changed not working: just change the patch into put method
    app.put('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDocument = {
        $set: {
          status: 'Deny'
        },
      };
      const result = await classesCollection.updateOne(filter, updateDocument);
      res.send(result)
    })

    //get classes
    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result)
    })


    //get classes for one email
    //TODO client e my classes e kaj na korle delete kore dibo
    app.get('/classes/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await classesCollection.find(query).toArray();
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Summer Camp School!')
})

app.listen(port, () => {
  console.log(`Summer Camp School is listening on port ${port}`)
})