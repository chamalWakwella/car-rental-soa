const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['car', 'van'], required: true, index: true },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    year: { type: Number },
    dailyRate: { type: Number, required: true, min: 0 },
    seats: { type: Number, default: 5 },
    isOnRent: { type: Boolean, default: false, index: true },
    currentRentalId: { type: String, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

vehicleSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
  },
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
