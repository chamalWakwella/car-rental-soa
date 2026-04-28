const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    customerSnapshot: {
      name: String,
      age: Number,
    },
    vehicleId: { type: String, required: true, index: true },
    vehicleSnapshot: {
      type: { type: String },
      make: String,
      model: String,
      registrationNumber: String,
      dailyRate: Number,
    },
    startDate: { type: Date, required: true, default: Date.now },
    expectedReturnDate: { type: Date, required: true },
    actualReturnDate: { type: Date, default: null },
    daysRented: { type: Number, required: true, min: 1 },
    baseCost: { type: Number, required: true },
    ageAdjustment: { type: Number, default: 0 },
    ageAdjustmentReason: { type: String, default: '' },
    totalCost: { type: Number, required: true },
    penaltyCharges: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

rentalSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
  },
});

module.exports = mongoose.model('Rental', rentalSchema);
