const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    senderApprovedToManager: { type: Boolean, default: false },
    receiverApprovedToManager: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Interest', interestSchema);
