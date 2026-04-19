require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Player = require("../models/Player");
const iconLegends = require("../data/iconLegends");

async function run() {
  process.env.MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || "mongodb://127.0.0.1:27017/test";

  await connectDB();

  const operations = iconLegends.map((player) => ({
    updateOne: {
      filter: {
        source: "dream-squad-icons",
        full_name: player.full_name
      },
      update: {
        $set: player
      },
      upsert: true
    }
  }));

  const result = await Player.bulkWrite(operations);
  const storedIcons = await Player.countDocuments({ source: "dream-squad-icons" });

  console.log(
    JSON.stringify(
      {
        success: true,
        inserted: result.upsertedCount || 0,
        modified: result.modifiedCount || 0,
        matched: result.matchedCount || 0,
        storedIcons
      },
      null,
      2
    )
  );
}

run()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          success: false,
          message: error.message
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (error) {
      // Nothing else to do if disconnect fails on shutdown.
    }
  });
