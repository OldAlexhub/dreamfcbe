const OwnedCard = require("../models/OwnedCard");
const Pack = require("../models/Pack");
const Player = require("../models/Player");
const { applyCooldownIfNeeded } = require("./economyService");
const {
  calculateEffectiveOverall,
  calculateGameScore,
  getInternationalReputation,
  getMarketValueEuro,
  getPlayerOverall,
  isIconPlayer,
} = require("../utils/playerData");
const weightedRandom = require("../utils/weightedRandom");

const RARITY_BANDS = {
  common: { min: 0, max: 74 },
  rare: { min: 75, max: 82 },
  epic: { min: 83, max: 88 },
  legendary: { min: 89, max: 95 },
  icon: { min: 96, max: 99 },
};

const DEFAULT_PACK_SEEDS = [
  {
    name: "Basic Pack",
    cost: 500,
    minPlayers: 3,
    maxPlayers: 4,
    odds: {
      common: 74,
      rare: 21,
      epic: 4.65,
      legendary: 0.34,
      icon: 0.01,
    },
    active: true,
  },
  {
    name: "Silver Pack",
    cost: 1000,
    minPlayers: 4,
    maxPlayers: 5,
    odds: {
      common: 50,
      rare: 33.5,
      epic: 13,
      legendary: 3.45,
      icon: 0.05,
    },
    active: true,
  },
  {
    name: "Gold Pack",
    cost: 2500,
    minPlayers: 5,
    maxPlayers: 6,
    odds: {
      common: 24,
      rare: 39,
      epic: 28,
      legendary: 8.75,
      icon: 0.25,
    },
    active: true,
  },
  {
    name: "Elite Pack",
    cost: 4000,
    minPlayers: 5,
    maxPlayers: 7,
    odds: {
      common: 8,
      rare: 29,
      epic: 41,
      legendary: 21.1,
      icon: 0.9,
    },
    active: true,
  },
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

function getConfiguredNumber(value, fallbackValue) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

function getIconPoolLimit() {
  return Math.max(
    1,
    Math.floor(getConfiguredNumber(process.env.PACK_ICON_POOL_LIMIT, 12)),
  );
}

function getFallbackRarityOrder(targetRarity) {
  const orders = {
    common: ["common", "rare", "epic", "legendary"],
    rare: ["rare", "common", "epic", "legendary"],
    epic: ["epic", "rare", "legendary", "common"],
    legendary: ["legendary", "epic", "rare", "common"],
    icon: ["icon", "legendary", "epic", "rare", "common"],
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
        onNull: null,
      },
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
          onNull: null,
        },
      },
      buildNumericFieldExpression(remainingFieldNames),
    ],
  };
}

function getCandidatePullScore(player, rarity) {
  const overall = getPlayerOverall(player);
  const effectiveOverall = calculateEffectiveOverall(player);
  const marketValue = getMarketValueEuro(player);
  const marketBonus =
    marketValue > 0
      ? Math.min(24, Math.round(Math.log10(marketValue + 1) * 2))
      : 0;
  const reputationBonus = getInternationalReputation(player) * 10;
  const explicitIconBonus = isIconPlayer(player) ? 180 : 0;
  const rarityBonus =
    {
      common: 0,
      rare: 6,
      epic: 12,
      legendary: 20,
      icon: 28,
    }[rarity] || 0;

  return (
    effectiveOverall * 8 +
    overall * 5 +
    marketBonus +
    reputationBonus +
    rarityBonus +
    explicitIconBonus +
    calculateGameScore(player)
  );
}

function pickWeightedCandidate(candidates, rarity) {
  const weightedCandidates = candidates
    .map((player) => ({
      player,
      weight: Math.max(1, getCandidatePullScore(player, rarity)),
    }))
    .filter((candidate) => candidate.weight > 0);

  if (!weightedCandidates.length) {
    return null;
  }

  const totalWeight = weightedCandidates.reduce(
    (sum, candidate) => sum + candidate.weight,
    0,
  );
  let roll = Math.random() * totalWeight;

  for (const candidate of weightedCandidates) {
    roll -= candidate.weight;

    if (roll <= 0) {
      return candidate.player;
    }
  }

  return weightedCandidates[weightedCandidates.length - 1].player;
}

async function findRandomIconPlayer(excludedPlayerIds = []) {
  const iconCandidates = await Player.aggregate([
    {
      $addFields: {
        numericOverall: buildNumericFieldExpression([
          "overall",
          "overall_rating",
        ]),
      },
    },
    {
      $match: {
        _id: {
          $nin: excludedPlayerIds,
        },
        $or: [
          { isIcon: true },
          { is_icon: true },
          { isDreamIcon: true },
          { rarity: /icon/i },
          { rarity_tier: /icon/i },
          { cardDesign: /icon/i },
          { card_design: /icon/i },
          { specialEdition: /icon/i },
          { special_edition: /icon/i },
          { cardSeries: /icon/i },
          { card_series: /icon/i },
        ],
      },
    },
    { $sort: { numericOverall: -1, name: 1, full_name: 1, long_name: 1 } },
    { $limit: Math.max(24, getIconPoolLimit()) },
  ]);
  const prioritizedCandidates = iconCandidates
    .filter((player) => isIconPlayer(player))
    .sort(
      (leftPlayer, rightPlayer) =>
        getCandidatePullScore(rightPlayer, "icon") -
        getCandidatePullScore(leftPlayer, "icon"),
    )
    .slice(0, getIconPoolLimit());
  const player = pickWeightedCandidate(prioritizedCandidates, "icon");

  if (!player) {
    return null;
  }

  return {
    player,
    rarity: "icon",
  };
}

async function findRandomPlayerByBand(rarity, excludedPlayerIds = []) {
  const fallbackOrder = getFallbackRarityOrder(rarity);

  for (const currentRarity of fallbackOrder) {
    if (currentRarity === "icon") {
      const iconPlayer = await findRandomIconPlayer(excludedPlayerIds);

      if (iconPlayer) {
        return iconPlayer;
      }

      continue;
    }

    const band = RARITY_BANDS[currentRarity];

    const candidates = await Player.aggregate([
      {
        $addFields: {
          numericOverall: buildNumericFieldExpression([
            "overall",
            "overall_rating",
          ]),
        },
      },
      {
        $match: {
          _id: {
            $nin: excludedPlayerIds,
          },
          numericOverall: {
            $gte: band.min,
            $lte: band.max,
          },
        },
      },
      { $sample: { size: 40 } },
    ]);

    const player = candidates
      .filter((candidate) => !isIconPlayer(candidate))
      .sort((leftPlayer, rightPlayer) => {
        return (
          getCandidatePullScore(rightPlayer, currentRarity) -
          getCandidatePullScore(leftPlayer, currentRarity)
        );
      })
      .slice(0, 1)[0];

    if (player) {
      return {
        player,
        rarity: currentRarity,
      };
    }
  }

  const fallbackCandidates = await Player.aggregate([
    {
      $addFields: {
        numericOverall: buildNumericFieldExpression([
          "overall",
          "overall_rating",
        ]),
      },
    },
    {
      $match: {
        _id: {
          $nin: excludedPlayerIds,
        },
        numericOverall: {
          $ne: null,
        },
      },
    },
    { $sample: { size: 40 } },
  ]);
  const fallbackRarity = rarity === "icon" ? "legendary" : rarity;
  const fallbackPlayer = fallbackCandidates
    .filter((candidate) => !isIconPlayer(candidate))
    .sort(
      (leftPlayer, rightPlayer) =>
        getCandidatePullScore(rightPlayer, fallbackRarity) -
        getCandidatePullScore(leftPlayer, fallbackRarity),
    )
    .slice(0, 1)[0];

  if (!fallbackPlayer) {
    return null;
  }

  return {
    player: fallbackPlayer,
    rarity: fallbackRarity,
  };
}

async function seedDefaultPacks() {
  if (!DEFAULT_PACK_SEEDS.length) {
    return;
  }

  const operations = DEFAULT_PACK_SEEDS.map((pack) => ({
    updateOne: {
      filter: { name: pack.name },
      update: {
        $set: {
          cost: pack.cost,
          minPlayers: pack.minPlayers,
          maxPlayers: pack.maxPlayers,
          odds: pack.odds,
          active: pack.active,
        },
        $setOnInsert: {
          name: pack.name,
        },
      },
      upsert: true,
    },
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
    throw createError(
      "Players collection is empty. Import FIFA players before opening packs.",
      503,
      {
        collection: "players",
      },
    );
  }

  if (user.coins < pack.cost) {
    const cooldownStatus = await applyCooldownIfNeeded(user);

    throw createError(`Not enough coins to open ${pack.name}.`, 400, {
      currentCoins: user.coins,
      packCost: pack.cost,
      cooldownStatus,
    });
  }

  const totalPulls = randomIntegerBetween(pack.minPlayers, pack.maxPlayers);
  const pulls = [];
  const excludedPlayerIds = [];

  for (let index = 0; index < totalPulls; index += 1) {
    const rolledRarity = weightedRandom(pack.odds);
    const pulledPlayer = await findRandomPlayerByBand(
      rolledRarity,
      excludedPlayerIds,
    );

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
        collection: "players",
      },
    );
  }

  const createdCards = await OwnedCard.insertMany(
    pulls.map((pull) => ({
      userId: user._id,
      playerId: pull.player._id,
      acquiredFromPack: pack.name,
      rarity: pull.rarity,
    })),
  );

  user.coins -= pack.cost;
  user.packsOpened += 1;
  await user.save();

  const populatedCards = await OwnedCard.find({
    _id: { $in: createdCards.map((card) => card._id) },
  })
    .populate("playerId")
    .sort({ acquiredAt: 1 });

  const cooldownStatus = await applyCooldownIfNeeded(user);

  return {
    pack,
    pulledCards: populatedCards,
    cooldownStatus,
    pullSummary: {
      highestOverall: Math.max(
        ...populatedCards.map((card) => getPlayerOverall(card.playerId)),
      ),
      rarityBreakdown: pulls.reduce((summary, pull) => {
        summary[pull.rarity] = (summary[pull.rarity] || 0) + 1;
        return summary;
      }, {}),
    },
    user,
  };
}

module.exports = {
  DEFAULT_PACK_SEEDS,
  RARITY_BANDS,
  getActivePacks,
  openPack,
  seedDefaultPacks,
};
