const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  model: { type: String, required: true },
  registrationNo: { type: String, required: true, unique: true },
  year: { type: Number },
  color: { type: String },
  image: { type: String }
});

const Car = mongoose.model('Car', carSchema);

module.exports = Car;