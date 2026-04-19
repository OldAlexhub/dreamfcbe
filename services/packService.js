const OwnedCard = require("../models/OwnedCard");
const Pack = require("../models/Pack");
const Player = require("../models/Player");
const { applyCooldownIfNeeded } = require("./economyService");
const { getPlayerOverall } = require("../utils/playerData");
const weightedRandom = require("../utils/weightedRandom");

const RARITY_BANDS = {
  common: { min: 0, max: 69 },
  rare: { min: 70, max: 79 },
  epic: { min: 80, max: 86 },
  legendary: { min: 87, max: 91 },
  icon: { min: 92, max: 99 }
};

// Seed-ready pack data. The service upserts these on startup.
const DEFAULT_PACK_SEEDS = [
  {
    name: "Basic Pack",
    cost: 200,
    minPlayers: 3,
    maxPlayers: 4,
    odds: {
      common: 72,
      rare: 22,
      epic: 5,
      legendary: 1,
      icon: 0.1
    },
    active: true
  },
  {
    name: "Silver Pack",
    cost: 450,
    minPlayers: 4,
    maxPlayers: 5,
    odds: {
      common: 45,
      rare: 35,
      epic: 15,
      legendary: 4,
      icon: 1
    },
    active: true
  },
  {
    name: "Gold Pack",
    cost: 800,
    minPlayers: 5,
    maxPlayers: 6,
    odds: {
      common: 20,
      rare: 40,
      epic: 28,
      legendary: 10,
      icon: 2
    },
    active: true
  },
  {
    name: "Elite Pack",
    cost: 1400,
    minPlayers: 5,
    maxPlayers: 7,
    odds: {
      common: 5,
      rare: 25,
      epic: 40,
      legendary: 23,
      icon: 7
    },
    active: true
  }
];

function createError(message, statusCode, details) {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (details) {
    error.details = details;
  }

  return error;
}

function randomIntegerBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getFallbackRarityOrder(targetRarity) {
  const orders = {
    common: ["common", "rare", "epic", "legendary", "icon"],
    rare: ["rare", "common", "epic", "legendary", "icon"],
    epic: ["epic", "rare", "legendary", "common", "icon"],
    legendary: ["legendary", "icon", "epic", "rare", "common"],
    icon: ["icon", "legendary", "epic", "rare", "common"]
  };

  return orders[targetRarity] || orders.common;
}

function buildNumericFieldExpression(fieldNames) {
  if (fieldNames.length === 1) {
    return {
      $convert: {
        input: `$${fieldNames[0]}`,
        to: "double",
        onError: null,
        onNull: null
      }
    };
  }

  const [firstFieldName, ...remainingFieldNames] = fieldNames;

  return {
    $ifNull: [
      {
        $convert: {
          input: `$${firstFieldName}`,
          to: "double",
          onError: null,
          onNull: null
        }
      },
      buildNumericFieldExpression(remainingFieldNames)
    ]
  };
}

function buildPullScoreExpression() {
  return {
    $add: [
      {
        $multiply: [{ $ifNull: ["$numericOverall", 0] }, 100]
      },
      {
        $multiply: [{ $ifNull: ["$internationalReputationValue", 0] }, 12]
      },
      {
        $ln: {
          $add: [{ $ifNull: ["$marketValueEuro", 0] }, 1]
        }
      }
    ]
  };
}

async function findRandomPlayerByBand(rarity, excludedPlayerIds = []) {
  const fallbackOrder = getFallbackRarityOrder(rarity);

  for (const currentRarity of fallbackOrder) {
    const band = RARITY_BANDS[currentRarity];

    const [player] = await Player.aggregate([
      {
        $addFields: {
          numericOverall: buildNumericFieldExpression(["overall", "overall_rating"]),
          internationalReputationValue: buildNumericFieldExpression([
            "international_reputation",
            "international_reputation_1_5"
          ]),
          marketValueEuro: buildNumericFieldExpression(["value_eur", "value_euro"])
        }
      },
      {
        $addFields: {
          pullScore: buildPullScoreExpression()
        }
      },
      {
        $match: {
          _id: {
            $nin: excludedPlayerIds
          },
          numericOverall: {
            $gte: band.min,
            $lte: band.max
          }
        }
      },
      { $sample: { size: 25 } },
      { $sort: { pullScore: -1 } },
      { $limit: 1 }
    ]);

    if (player) {
      return {
        player,
        rarity: currentRarity
      };
    }
  }

  const [fallbackPlayer] = await Player.aggregate([
    {
      $addFields: {
        numericOverall: buildNumericFieldExpression(["overall", "overall_rating"]),
        internationalReputationValue: buildNumericFieldExpression([
          "international_reputation",
          "international_reputation_1_5"
        ]),
        marketValueEuro: buildNumericFieldExpression(["value_eur", "value_euro"])
      }
    },
    {
      $addFields: {
        pullScore: buildPullScoreExpression()
      }
    },
    {
      $match: {
        _id: {
          $nin: excludedPlayerIds
        },
        numericOverall: {
          $ne: null
        }
      }
    },
    { $sample: { size: 25 } },
    { $sort: { pullScore: -1 } },
    { $limit: 1 }
  ]);

  if (!fallbackPlayer) {
    return null;
  }

  return {
    player: fallbackPlayer,
    rarity
  };
}

async function seedDefaultPacks() {
  if (!DEFAULT_PACK_SEEDS.length) {
    return;
  }

  const operations = DEFAULT_PACK_SEEDS.map((pack) => ({
    updateOne: {
      filter: { name: pack.name },
      update: { $setOnInsert: pack },
      upsert: true
    }
  }));

  await Pack.bulkWrite(operations);
}

async function getActivePacks() {
  return Pack.find({ active: true }).sort({ cost: 1, name: 1 });
}

async function openPack(user, packId) {
  const pack = await Pack.findOne({ _id: packId, active: true });

  if (!pack) {
    throw createError("Pack not found or inactive.", 404);
  }

  const playerCount = await Player.estimatedDocumentCount();

  if (!playerCount) {
    throw createError("Players collection is empty. Import FIFA players before opening packs.", 503, {
      collection: "players"
    });
  }

  if (user.coins < pack.cost) {
    const cooldownStatus = await applyCooldownIfNeeded(user);

    throw createError(`Not enough coins to open ${pack.name}.`, 400, {
      currentCoins: user.coins,
      packCost: pack.cost,
      cooldownStatus
    });
  }

  const totalPulls = randomIntegerBetween(pack.minPlayers, pack.maxPlayers);
  const pulls = [];
  const excludedPlayerIds = [];

  for (let index = 0; index < totalPulls; index += 1) {
    const rolledRarity = weightedRandom(pack.odds);
    const pulledPlayer = await findRandomPlayerByBand(rolledRarity, excludedPlayerIds);

    if (pulledPlayer) {
      pulls.push(pulledPlayer);
      excludedPlayerIds.push(pulledPlayer.player._id);
    }
  }

  if (!pulls.length) {
    throw createError(
      "No eligible players were found. Make sure the players collection has usable overall ratings.",
      503,
      {
        collection: "players"
      }
    );
  }

  const createdCards = await OwnedCard.insertMany(
    pulls.map((pull) => ({
      userId: user._id,
      playerId: pull.player._id,
      acquiredFromPack: pack.name,
      rarity: pull.rarity
    }))
  );

  user.coins -= pack.cost;
  user.packsOpened += 1;
  await user.save();

  const populatedCards = await OwnedCard.find({
    _id: { $in: createdCards.map((card) => card._id) }
  })
    .populate("playerId")
    .sort({ acquiredAt: 1 });

  const cooldownStatus = await applyCooldownIfNeeded(user);

  return {
    pack,
    pulledCards: populatedCards,
    cooldownStatus,
    pullSummary: {
      highestOverall: Math.max(...populatedCards.map((card) => getPlayerOverall(card.playerId))),
      rarityBreakdown: pulls.reduce((summary, pull) => {
        summary[pull.rarity] = (summary[pull.rarity] || 0) + 1;
        return summary;
      }, {})
    },
    user
  };
}

module.exports = {
  DEFAULT_PACK_SEEDS,
  RARITY_BANDS,
  getActivePacks,
  openPack,
  seedDefaultPacks
};
