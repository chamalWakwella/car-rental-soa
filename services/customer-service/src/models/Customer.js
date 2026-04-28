const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    dateOfBirth: { type: Date, required: true },
    licenseNumber: { type: String, trim: true },
  },
  { timestamps: true }
);

customerSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const diffMs = Date.now() - new Date(this.dateOfBirth).getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
});

customerSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
  },
});

module.exports = mongoose.model('Customer', customerSchema);
