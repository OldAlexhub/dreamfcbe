const OwnedCard = require("../models/OwnedCard");
const Squad = require("../models/Squad");
const Pack = require("../models/Pack");
const {
  calculateEffectiveOverall,
  getPlayerCardRarity,
  getInternationalReputation,
  getMarketValueEuro,
  getPlayerOverall,
  getPlayerPotential,
  getSkillMoves,
  getWeakFoot,
} = require("../utils/playerData");

const COOLDOWN_HOURS = 24;
const RARITY_MULTIPLIERS = {
  common: 1,
  rare: 1.6,
  epic: 2.7,
  legendary: 4.2,
  icon: 6.5,
};

function createError(message, statusCode, details) {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (details) {
    error.details = details;
  }

  return error;
}

function getConfiguredNumber(value, fallbackValue) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

function getRefillCoins() {
  return getConfiguredNumber(process.env.REFILL_COINS, 500);
}

function getRarityFromOverall(overall) {
  if (overall >= 89) {
    return "legendary";
  }

  if (overall >= 83) {
    return "epic";
  }

  if (overall >= 75) {
    return "rare";
  }

  return "common";
}

function calculateSellValue(player, rarity) {
  const overall = getPlayerOverall(player);
  const effectiveOverall = calculateEffectiveOverall(player);
  const resolvedRarity =
    rarity || getPlayerCardRarity(player) || getRarityFromOverall(overall);
  const multiplier = RARITY_MULTIPLIERS[resolvedRarity] || 1;
  const potential = getPlayerPotential(player);
  const internationalReputation = getInternationalReputation(player);
  const skillMoves = getSkillMoves(player);
  const weakFoot = getWeakFoot(player);
  const marketValue = getMarketValueEuro(player);
  const marketBonus =
    marketValue > 0
      ? Math.min(26, Math.round(Math.log10(marketValue + 1) * 2.2))
      : 0;
  const baseValue = Math.max(
    12,
    Math.round(
      (effectiveOverall - 35) * 1.4 +
        (overall - 40) * 0.45 +
        potential * 0.14 +
        internationalReputation * 8 +
        skillMoves * 3 +
        weakFoot * 2 +
        marketBonus,
    ),
  );

  return Math.round(baseValue * multiplier);
}

async function getCheapestActivePack() {
  return Pack.findOne({ active: true }).sort({ cost: 1, name: 1 });
}

function buildCooldownStatus(user, cheapestPack) {
  const cheapestPackCost = cheapestPack ? cheapestPack.cost : null;
  const cooldownDate = user.coinCooldownUntil
    ? new Date(user.coinCooldownUntil)
    : null;
  const isStuck =
    cheapestPackCost !== null ? Number(user.coins) < cheapestPackCost : false;
  const millisecondsRemaining =
    cooldownDate && cooldownDate.getTime() > Date.now()
      ? cooldownDate.getTime() - Date.now()
      : 0;

  return {
    isStuck,
    cheapestPackCost,
    coinCooldownUntil: cooldownDate,
    canClaimRefill: Boolean(
      isStuck && cooldownDate && millisecondsRemaining === 0,
    ),
    millisecondsRemaining,
  };
}

async function applyCooldownIfNeeded(user) {
  const cheapestPack = await getCheapestActivePack();
  const cheapestPackCost = cheapestPack ? cheapestPack.cost : null;
  const isStuck =
    cheapestPackCost !== null ? Number(user.coins) < cheapestPackCost : false;
  let didChange = false;

  if (isStuck && !user.coinCooldownUntil) {
    user.coinCooldownUntil = new Date(
      Date.now() + COOLDOWN_HOURS * 60 * 60 * 1000,
    );
    didChange = true;
  }

  if (!isStuck && user.coinCooldownUntil) {
    user.coinCooldownUntil = null;
    didChange = true;
  }

  if (didChange) {
    await user.save();
  }

  return buildCooldownStatus(user, cheapestPack);
}

async function claimRefill(user) {
  const cheapestPack = await getCheapestActivePack();

  if (!cheapestPack) {
    throw createError("No active packs are available right now.", 503);
  }

  const currentStatus = buildCooldownStatus(user, cheapestPack);

  if (!currentStatus.isStuck) {
    if (user.coinCooldownUntil) {
      user.coinCooldownUntil = null;
      await user.save();
    }

    throw createError(
      "Refill is only available when you cannot afford the cheapest pack.",
      400,
      {
        cooldownStatus: currentStatus,
      },
    );
  }

  if (!user.coinCooldownUntil) {
    user.coinCooldownUntil = new Date(
      Date.now() + COOLDOWN_HOURS * 60 * 60 * 1000,
    );
    await user.save();

    throw createError(
      "Refill cooldown started. Come back after 24 hours.",
      400,
      {
        cooldownStatus: buildCooldownStatus(user, cheapestPack),
      },
    );
  }

  if (new Date(user.coinCooldownUntil).getTime() > Date.now()) {
    throw createError("Refill is not ready yet.", 400, {
      cooldownStatus: buildCooldownStatus(user, cheapestPack),
    });
  }

  const refillAmount = getRefillCoins();

  user.coins += refillAmount;
  user.coinCooldownUntil = null;
  await user.save();

  const cooldownStatus = await applyCooldownIfNeeded(user);

  return {
    refillAmount,
    cooldownStatus,
    user,
  };
}

async function sellOwnedCards(user, ownedCardIds) {
  const uniqueIds = [...new Set(ownedCardIds.map((id) => String(id)))];

  if (!uniqueIds.length) {
    throw createError("At least one ownedCardId is required.", 400);
  }

  const ownedCards = await OwnedCard.find({
    _id: { $in: uniqueIds },
    userId: user._id,
  }).populate("playerId");

  if (ownedCards.length !== uniqueIds.length) {
    throw createError("One or more cards do not belong to this user.", 403);
  }

  const squadCards = ownedCards.filter((card) => card.isInSquad);

  if (squadCards.length) {
    const squad = await Squad.findOne({ userId: user._id });

    if (squad) {
      const sellIds = squadCards.map((c) => String(c._id));

      // Remove sold cards from the squad startingXI
      squad.startingXI = Array.isArray(squad.startingXI)
        ? squad.startingXI.filter((id) => !sellIds.includes(String(id)))
        : [];

      // Recalculate squad overall using remaining owned cards
      const remainingStartingIds = squad.startingXI.map((id) => String(id));
      const remainingCards = remainingStartingIds.length
        ? await OwnedCard.find({ _id: { $in: remainingStartingIds } }).populate(
            "playerId",
          )
        : [];

      const calculateSquadOverall = require("../utils/calculateSquadOverall");
      squad.overall = calculateSquadOverall(remainingCards);
      await squad.save();

      // Sync isInSquad flags: clear all then set for remaining startingXI
      await OwnedCard.updateMany(
        { userId: user._id },
        { $set: { isInSquad: false } },
      );

      if (remainingStartingIds.length) {
        await OwnedCard.updateMany(
          { _id: { $in: remainingStartingIds } },
          { $set: { isInSquad: true } },
        );
      }
    }
  }

  const totalCoinsEarned = ownedCards.reduce((sum, card) => {
    return sum + calculateSellValue(card.playerId, card.rarity);
  }, 0);

  await OwnedCard.deleteMany({
    _id: { $in: uniqueIds },
    userId: user._id,
  });

  user.coins += totalCoinsEarned;
  await user.save();

  const cooldownStatus = await applyCooldownIfNeeded(user);

  return {
    soldCount: ownedCards.length,
    totalCoinsEarned,
    cooldownStatus,
    user,
    soldCards: ownedCards,
  };
}

module.exports = {
  applyCooldownIfNeeded,
  buildCooldownStatus,
  calculateSellValue,
  claimRefill,
  getCheapestActivePack,
  getPlayerOverall,
  getRarityFromOverall,
  getRefillCoins,
  sellOwnedCards,
};
