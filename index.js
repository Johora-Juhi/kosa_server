const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

// middlewre
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bkdzfxe.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const usersCollection = client.db("hairSalon").collection("users");
    const productsCollection = client.db("hairSalon").collection("products");
    const blogsCollection = client.db("hairSalon").collection("blogs");
    const commentsCollection = client.db("hairSalon").collection("comment");
    const interestedCustomerCollection = client
      .db("hairSalon")
      .collection("interestedCustomer");
    const ordersCollection = client.db("hairSalon").collection("orders");

    // VERIFY ADMIN
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    // send token
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "24h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    // verify admin token
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    // create usersCollection
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //get users
    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    //get all admins
    app.get("/users/admins", async (req, res) => {
      const users = await usersCollection.find({ role: "admin" }).toArray();
      res.send(users);
    });

    //delete user
    app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    // make admin
    app.put("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // get user
    app.get("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.find(query).toArray();
      res.send(user);
    });

    //get all blogs
    app.get("/blogs", async (req, res) => {
      const query = {};
      const users = await blogsCollection.find(query).toArray();
      res.send(users);
    });

    //add blog
    app.post("/blogs", async (req, res) => {
      const blog = req.body;
      console.log(blog);
      const result = await blogsCollection.insertOne(blog);
      res.send(result);
    });

    //get blog details
    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const blog = await blogsCollection.find(query).toArray();
      res.send(blog);
    });

    //delete blog
    app.delete("/blogs/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await blogsCollection.deleteOne(filter);
      res.send(result);
    });

    // add comment
    app.post("/comments", async (req, res) => {
      const comments = req.body;
      console.log(comments);
      const result = await commentsCollection.insertOne(comments);
      res.send(result);
    });

    // get commnets
    app.get("/comments", async (req, res) => {
      const query = {};
      const users = await commentsCollection.find(query).toArray();
      res.send(users);
    });

    // get indivisual comment
    app.get("/mycomments", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = {
        userEmail: email,
      };
      const comments = await commentsCollection.find(query).toArray();
      res.send(comments);
    });

    // delete comment
    app.delete("/mycomments/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await commentsCollection.deleteOne(filter);
      res.send(result);
    });

    // interested customer
    app.post("/interestedCustomer", async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await interestedCustomerCollection.insertOne(user);
      res.send(result);
    });
    //get all products
    app.get("/products", async (req, res) => {
      const query = {};
      const users = await productsCollection.find(query).toArray();
      res.send(users);
    });

    // place order
    app.post("/orderPlace", verifyJWT, async (req, res) => {
      const orderPlace = req.body;
      console.log(orderPlace);
      const result = await ordersCollection.insertOne(orderPlace);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hair Saloon server is running");
});

app.listen(port, () => {
  console.log(`Hair Saloon is running on port ${port}`);
});
