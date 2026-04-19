const mongoose = require("mongoose");

const packSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    minPlayers: {
      type: Number,
      required: true,
      min: 1
    },
    maxPlayers: {
      type: Number,
      required: true,
      min: 1
    },
    odds: {
      common: { type: Number, default: 0 },
      rare: { type: Number, default: 0 },
      epic: { type: Number, default: 0 },
      legendary: { type: Number, default: 0 },
      icon: { type: Number, default: 0 }
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

packSchema.path("maxPlayers").validate(function validateMaxPlayers(value) {
  return value >= this.minPlayers;
}, "maxPlayers must be greater than or equal to minPlayers.");

module.exports = mongoose.model("Pack", packSchema);
