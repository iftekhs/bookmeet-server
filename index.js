const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const mongoose = require('mongoose');
const User = require('./Models/User');
const port = process.env.PORT || 5000;

// Initial calls
mongoose.set('strictQuery', false);
mongoose.connect('mongodb://127.0.0.1:27017/BookMeet');
require('dotenv').config();

// middlewares
app.use(cors());
app.use(express.json());

// ------------------------------- Routes ---------------------------------

const main = async () => {
  //------------------------ Guards -------------------------
  function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      req.decoded = decoded;
      next();
    });
  }

  const verifyAdmin = async (req, res, next) => {
    const decodedEmail = req.decoded.email;
    const query = { email: decodedEmail };
    const user = await usersCollection.findOne(query);

    if (user?.role !== 'admin') {
      return res.status(403).send({ message: 'forbidden access' });
    }
    next();
  };
  //------------------------ Guards -------------------------

  try {
    // ------------------------------- Users ---------------------------------
    app.post('/users', async (req, res) => {
      const user = req.body;
      const savedUser = await User.findOne({ email: user.email });
      if (savedUser) {
        return res.send({ acknowledged: false });
      }
      user.role = 'user';
      const result = await User.create(user);
      res.send(result);
    });
    // ------------------------------- Users ---------------------------------

    // ------------------------------- Authentication ---------------------------------
    app.post('/jwt', async (req, res) => {
      const email = req.body.email;
      const user = await User.findOne({ email: email });
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET);
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: '' });
    });
  } catch (error) {
    console.log(error);
  }
  // ------------------------------- Authentication ---------------------------------
};

main().catch(console.error);
// ------------------------------- Routes ---------------------------------

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
