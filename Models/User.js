const { default: mongoose, Schema } = require('mongoose');

const userDataSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
});

const User = mongoose.model('User', userDataSchema);

module.exports = User;
