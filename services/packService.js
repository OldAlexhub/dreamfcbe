const OwnedCard = require("../models/OwnedCard");
const Pack = require("../models/Pack");
const Player = require("../models/Player");
const { applyCooldownIfNeeded } = require("./economyService");
const {
  calculateEffectiveOverall,
  calculateGameScore,
  getInternationalReputation,
  getMarketValueEuro,
  getPlayerOverall
} = require("../utils/playerData");
const weightedRandom = require("../utils/weightedRandom");

const RARITY_BANDS = {
  common: { min: 0, max: 74 },
  rare: { min: 75, max: 82 },
  epic: { min: 83, max: 88 },
  legendary: { min: 89, max: 92 },
  icon: { min: 93, max: 99 }
};

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
      icon: 0.08
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
      icon: 0.8
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

function getCandidatePullScore(player, rarity) {
  const overall = getPlayerOverall(player);
  const effectiveOverall = calculateEffectiveOverall(player);
  const marketValue = getMarketValueEuro(player);
  const marketBonus = marketValue > 0 ? Math.min(24, Math.round(Math.log10(marketValue + 1) * 2)) : 0;
  const reputationBonus = getInternationalReputation(player) * 10;
  const rarityBonus =
    {
      common: 0,
      rare: 6,
      epic: 12,
      legendary: 20,
      icon: 28
    }[rarity] || 0;

  return effectiveOverall * 8 + overall * 5 + marketBonus + reputationBonus + rarityBonus + calculateGameScore(player);
}

async function findRandomPlayerByBand(rarity, excludedPlayerIds = []) {
  const fallbackOrder = getFallbackRarityOrder(rarity);

  for (const currentRarity of fallbackOrder) {
    const band = RARITY_BANDS[currentRarity];

    const candidates = await Player.aggregate([
      {
        $addFields: {
          numericOverall: buildNumericFieldExpression(["overall", "overall_rating"])
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
      { $sample: { size: 40 } }
    ]);

    const player = candidates
      .sort((leftPlayer, rightPlayer) => {
        return getCandidatePullScore(rightPlayer, currentRarity) - getCandidatePullScore(leftPlayer, currentRarity);
      })
      .slice(0, 1)[0];

    if (player) {
      return {
        player,
        rarity: currentRarity
      };
    }
  }

  const fallbackCandidates = await Player.aggregate([
    {
      $addFields: {
        numericOverall: buildNumericFieldExpression(["overall", "overall_rating"])
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
    { $sample: { size: 40 } }
  ]);
  const fallbackPlayer = fallbackCandidates
    .sort((leftPlayer, rightPlayer) => getCandidatePullScore(rightPlayer, rarity) - getCandidatePullScore(leftPlayer, rarity))
    .slice(0, 1)[0];

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
