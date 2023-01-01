const { default: mongoose, Schema } = require('mongoose');

const meetingDataSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  code: { type: String, required: true },
});

const Meeting = mongoose.model('Meeting', meetingDataSchema);

module.exports = Meeting;
