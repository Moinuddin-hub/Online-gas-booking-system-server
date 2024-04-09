const express = require("express");
const app = express();
const cors = require("cors");
var jwt = require('jsonwebtoken');
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware;
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.epcinty.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const productCollection = client.db("gasDb").collection("product");
    const userCollection = client.db("gasDb").collection("users");
    const reviewCollection = client.db("gasDb").collection("reviews");
    const cartCollection = client.db("gasDb").collection("carts");
    // jwt related API
    app.post("/jwt", async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
        expiresIn: "1h",
      }); 
      console.log("jwt token", token);
      res.send({ token });
    });
    // middleware;
    const verifyToken= (req, res, next) => {
      console.log("inside verify token",req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message: "unauthorized access"});
      }
      const token=req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err){
          return res.status(401).send({message: "unauthorized access"})
        }
        req.decoded = decoded;
        next(); 
      })
    }
// user verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query={email: email};
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if(!isAdmin){
        return res.status(403).send({message: "forbidden access"})
      }
      next();
  
    }

    // Users related API
    app.get("/users",verifyToken, async (req, res) => {
      console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    });
 
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if( email!==req.decoded.email ){
        return res.status(403).send({message:'forbidden-access'});
      }
      const query={email: email};
      const user=await userCollection.findOne(query);
      let admin=false;
      if(user){
        admin=user?.role==="admin";
      }
      res.send({admin: admin});
    })

    app.patch("/user/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // product related API
    app.get("/product", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
      
    })
    app.post("/product", verifyToken,verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
      
    })
   app.patch("/product/:id", async (req, res) => {
    const product = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
    
      const updateDoc = {
        $set: {
          name: product.name,
          description: product.description,
          price: product.price,
          IssueDate: product.IssueDate,
          img: product.img,
        }
      }
      const result = await productCollection.updateOne(filter, updateDoc);
      res.send(result);
   })
    app.delete("/product/:id", verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
      
    })
    // reviews related API
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    // cart related API
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from my server");
});
app.listen(port, () => {
  console.log(`listening to port ${port}`);
});
