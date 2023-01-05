const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const Crypto = require('crypto');
const port = process.env.PORT || 5000;

// Models
const User = require('./Models/User');
const Meeting = require('./Models/Meeting');
const Booking = require('./Models/Booking');

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
    const user = await User.findOne(query);
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

    app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
      console.log(req.params);
      const query = { _id: ObjectId(req.params.id) };
      const result = await User.deleteOne(query);
      console.log(result);
      res.send(result);
    });

    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const users = await User.find({ role: 'user' });
      res.send(users);
    });

    app.get('/users/count', verifyJWT, verifyAdmin, async (req, res) => {
      const totalUsersCount = await User.count({ role: 'user' });
      res.status(200).send({ count: totalUsersCount });
    });

    app.get('/get/my-role', verifyJWT, async (req, res) => {
      const user = await User.findOne({ email: req.decoded.email });
      if (user) {
        return res.send({ role: user.role });
      }
      res.status(404).send({ message: 'No user found' });
    });

    // ------------------------------- Users ---------------------------------

    // ------------------------------- Meetings ---------------------------------
    app.post('/meetings', verifyJWT, async (req, res) => {
      const meeting = req.body;
      if (meeting.slots.length > 0) {
        meeting.slots.map((slot) => (slot.booked = []));
      }
      const currentTime = new Date().getTime().toString();
      meeting.code = Crypto.createHash('md5').update(currentTime).digest('hex');
      meeting.userEmail = req.decoded.email;
      const result = await Meeting.create(meeting);
      if (result) {
        return res.status(201).send({ acknowledged: true });
      }
      res.status(500).send({ message: 'Something went very wrong!' });
    });

    app.get('/meetings', verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const meetings = await Meeting.find({ userEmail: email });
      res.send(meetings);
    });

    app.get('/meetings/:id', verifyJWT, async (req, res) => {
      const meeting = await Meeting.findOne({ _id: ObjectId(req.params.id) });
      res.send(meeting);
    });

    app.get('/meeting/:code', verifyJWT, async (req, res) => {
      const meeting = await Meeting.findOne({ code: req.params.code });
      res.send(meeting);
    });

    app.get('/meeting/:id/slots/:date', verifyJWT, async (req, res) => {
      const meeting = await Meeting.findOne({ _id: ObjectId(req.params.id) });
      const slots = meeting.slots
        .filter((slot) => !slot.booked.includes(req.params.date))
        .map((slot) => {
          delete slot.booked;
          return slot;
        });
      res.send(slots);
    });

    app.delete('/meetings/:id', verifyJWT, async (req, res) => {
      const query = { _id: ObjectId(req.params.id), userEmail: req.decoded.email };
      const result = await Meeting.deleteOne(query);
      if (result) {
        await Booking.deleteMany({ meetingId: req.params.id });
      }
      res.send(result);
    });
    // ------------------------------- Meetings ---------------------------------
    // userEmail
    // slot
    // ------------------------------- Bookings ---------------------------------
    app.post('/bookings', verifyJWT, async (req, res) => {
      const booking = req.body;
      const meeting = await Meeting.findOne({ _id: ObjectId(booking.meetingId) });

      if (!meeting) {
        return res.status(400).send({ message: 'No meeting found' });
      }

      const selectedslot = meeting.slots[booking.slot];

      if (!selectedslot || selectedslot.booked.includes(booking.date)) {
        return res.status(400).send({ message: 'Invalid Slot Selected' });
      }
      selectedslot.booked.push(booking.date + '');
      meeting.slots[booking.slot] = selectedslot;
      if (meeting.save()) {
        booking.userEmail = req.decoded.email;
        booking.slot = { startTime: selectedslot.startTime, endTime: selectedslot.endTime };
        booking.createdAt = new Date();
        const result = await Booking.create(booking);
        if (result) {
          return res.status(201).send({ acknowledged: true });
        }
      } else {
        res.status(500).send({ message: 'Something went very wrong!' });
      }
    });

    app.get('/bookings', verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const bookings = await Booking.find({ userEmail: email });
      res.send(bookings);
    });
    // ------------------------------- Bookings ---------------------------------

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
