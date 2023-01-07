const { default: mongoose, Schema } = require('mongoose');

const meetingDataSchema = new Schema({
  title: { type: String, required: true },
  link: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: String, required: false },
  endDate: { type: String, required: false },
  futureDates: { type: Boolean, required: true },
  slots: { type: Array, require: true },
  booked: { type: Array, require: true },
  code: { type: String, required: true },
  userEmail: { type: String, require: true },
});

const Meeting = mongoose.model('Meeting', meetingDataSchema);

module.exports = Meeting;
