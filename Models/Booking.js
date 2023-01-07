const { default: mongoose, Schema } = require('mongoose');

const bookingDataSchema = new Schema(
  {
    userEmail: { type: String, required: true },
    meetingId: { type: String, required: true },
    date: { type: String, required: true },
    slot: { type: Object, require: true },
  },
  { timestamps: true }
);

const Booking = mongoose.model('Booking', bookingDataSchema);

module.exports = Booking;

// .map((slot) => {
//     delete slot.booked;
//     return slot;
//   });
