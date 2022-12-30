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

// ------------------------------- Authentication ---------------------------------

const main = async () => {
  try {
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
};

main().catch(console.error);
// ------------------------------- Authentication ---------------------------------

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
