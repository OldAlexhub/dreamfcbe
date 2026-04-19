const mongoose = require("mongoose");

function getStartingCoins() {
  const parsedValue = Number(process.env.STARTING_COINS);
  return Number.isFinite(parsedValue) ? parsedValue : 1000;
}

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 20
    },
    teamName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 32
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    coins: {
      type: Number,
      default: getStartingCoins,
      min: 0
    },
    coinCooldownUntil: {
      type: Date,
      default: null
    },
    packsOpened: {
      type: Number,
      default: 0,
      min: 0
    },
    wins: {
      type: Number,
      default: 0,
      min: 0
    },
    losses: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
