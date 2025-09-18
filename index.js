const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3007;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017"; // fallback for local dev
let db;

// Connect to MongoDB
async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log("✅ Successfully connected to MongoDB");
    db = client.db("users");

    // Start server only after DB connection
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}
connectDB();

// Middleware: JWT Authentication
const Authentication = (req, res, next) => {
  const token = req.headers["authorization"];
  if (token) {
    const jwtToken = token.split(" ")[1];
    if (jwtToken) {
      jwt.verify(jwtToken, "MYTOKEN", (err, payLoad) => {
        if (err) {
          return res.status(401).send(err);
        } else {
          req.id = payLoad.id;
          req.email = payLoad.email;
          next();
        }
      });
    } else {
      return res.status(401).send("Token Not Valid");
    }
  } else {
    return res.status(401).send("Token Not Provided");
  }
};

// Routes
app.post("/register", async (req, res) => {
  try {
    await db.collection("usersregistration").insertOne(req.body);
    return res.send("Successfully Registered");
  } catch (e) {
    console.error(e.message);
    return res.status(500).send(e.message);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.collection("usersregistration").findOne({ email });
    if (!user) return res.status(404).send("Email Not Found");

    if (user.password === password) {
      const payLoad = { id: new ObjectId(user._id), email: user.email };
      const jwtToken = jwt.sign(payLoad, "MYTOKEN", { expiresIn: "24h" });
      return res.send({ msg: "Successfully Login", jwtToken });
    } else {
      return res.status(401).send("Password Not Valid");
    }
  } catch (e) {
    console.error(e.message);
    return res.status(500).send("Login Failed");
  }
});

app.get("/users", Authentication, async (req, res) => {
  try {
    const user = await db
      .collection("usersregistration")
      .findOne({ _id: new ObjectId(req.id) });
    return res.send(user);
  } catch (e) {
    console.error(e.message);
    return res.status(500).send("Error fetching user");
  }
});

app.post("/book/orders", Authentication, async (req, res) => {
  const { email } = req;
  const { items } = req.body;

  const itemsArray = items.map((item) => ({
    customerEmail: email,
    itemId: item.id,
    itemName: item.name,
    itemQuantity: item.quantity,
  }));

  try {
    await db.collection("orders").insertMany(itemsArray);
    return res.send("Successfully Ordered");
  } catch (e) {
    console.error(e.message);
    return res.status(500).send("Error placing order");
  }
});

app.get("/user/orders", Authentication, async (req, res) => {
  try {
    const orders = await db
      .collection("usersregistration")
      .aggregate([
        { $match: { email: req.email } },
        {
          $lookup: {
            from: "orders",
            localField: "email",
            foreignField: "customerEmail",
            as: "customerorders",
          },
        },
      ])
      .toArray();
    return res.send(orders);
  } catch (e) {
    console.error(e.message);
    return res.status(500).send("Error fetching orders");
  }
});
