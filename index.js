const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const Crypto = require('crypto');
const port = process.env.PORT || 5000;
require('dotenv').config();
// Models
const User = require('./Models/User');
const Meeting = require('./Models/Meeting');
const Booking = require('./Models/Booking');

// Initial calls
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.g2un3jn.mongodb.net/BookMeet?retryWrites=true&w=majority`;
mongoose.set('strictQuery', false);
mongoose.connect(uri);
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
      const query = { _id: ObjectId(req.params.id) };
      const result = await User.deleteOne(query);
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
        meeting.slots.map(
          (slot, index) =>
            (slot._id = Crypto.createHash('md5')
              .update(index + '')
              .digest('hex'))
        );
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
      const slots = meeting.slots.filter((slot) => {
        if (
          !meeting.booked.includes(req.params.date + '--' + slot.startTime + '--' + slot.endTime)
        ) {
          return slot;
        }
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

      const selectedslot = meeting.slots.find((slot) => slot._id === booking.slot);

      const bookingDateAndSlot =
        booking.date + '--' + selectedslot.startTime + '--' + selectedslot.endTime;

      if (!selectedslot || meeting.booked.includes(bookingDateAndSlot)) {
        return res.status(400).send({ message: 'Invalid Slot Selected' });
      }

      meeting.booked = [...meeting.booked, bookingDateAndSlot];

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

    app.get('/meeting/:id/bookings', verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const meeting = await Meeting.findOne({ _id: ObjectId(req.params.id), userEmail: email });
      if (meeting) {
        const bookings = await Booking.find({ meetingId: meeting._id });
        res.send(bookings);
      } else {
        res.send({ message: 'No meeting found' });
      }
    });

    app.delete('/bookings/:id', verifyJWT, async (req, res) => {
      const query = { _id: ObjectId(req.params.id), userEmail: req.decoded.email };
      const booking = await Booking.findOne(query);
      const meetingId = booking.meetingId;
      if (booking.delete()) {
        const meeting = await Meeting.findOne({ _id: ObjectId(meetingId) });
        const filteredBooks = meeting.booked.filter(
          (book) =>
            book !== booking.date + '--' + booking.slot.startTime + '--' + booking.slot.endTime
        );
        meeting.booked = filteredBooks;
        meeting.save();

        return res.send({ acknowledged: true });
      }
      res.status(500).send({ message: 'Something went very wrong!' });
    });

    app.delete('/meeting/booking/:id', verifyJWT, async (req, res) => {
      const booking = await Booking.findOne({ _id: ObjectId(req.params.id) });
      const meeting = await Meeting.findOne({
        _id: ObjectId(booking.meetingId),
        userEmail: req.decoded.email,
      });

      if (!meeting) {
        return res.status(404).send({ message: 'No meeting found' });
      }

      if (booking.delete()) {
        const filteredBooks = meeting.booked.filter(
          (book) =>
            book !== booking.date + '--' + booking.slot.startTime + '--' + booking.slot.endTime
        );
        meeting.booked = filteredBooks;
        meeting.save();

        return res.send({ acknowledged: true });
      }
      res.status(500).send({ message: 'Something went very wrong!' });
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
