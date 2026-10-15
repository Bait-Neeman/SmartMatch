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
    // Who declined. Used only to label "דחיתי" versus "נדחה". Not an identity field.
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Stops the same sender from inserting two rows at once. The opposite direction
// (both people send together) is merged into one accepted interest in the service.
interestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model('Interest', interestSchema);
