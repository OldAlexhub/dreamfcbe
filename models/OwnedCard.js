const mongoose = require("mongoose");

const ownedCardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true
    },
    acquiredAt: {
      type: Date,
      default: Date.now
    },
    acquiredFromPack: {
      type: String,
      default: null,
      trim: true
    },
    rarity: {
      type: String,
      enum: ["common", "rare", "epic", "legendary", "icon"],
      default: "common"
    },
    isFavorite: {
      type: Boolean,
      default: false
    },
    isInSquad: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: false
  }
);

module.exports = mongoose.model("OwnedCard", ownedCardSchema);
