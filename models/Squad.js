const mongoose = require("mongoose");

const squadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    formation: {
      type: String,
      default: "4-3-3",
      trim: true
    },
    startingXI: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OwnedCard"
      }
    ],
    overall: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Squad", squadSchema);
