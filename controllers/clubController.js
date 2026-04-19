const OwnedCard = require("../models/OwnedCard");
const { applyCooldownIfNeeded, calculateSellValue, claimRefill, sellOwnedCards } = require("../services/economyService");
const buildCollectionInsights = require("../utils/buildCollectionInsights");
const serializeOwnedCard = require("../utils/serializeOwnedCard");

function buildClubSummary(user) {
  return {
    id: user._id,
    username: user.username,
    coins: user.coins,
    packsOpened: user.packsOpened,
    wins: user.wins,
    losses: user.losses
  };
}

function extractOwnedCardIds(body) {
  if (body.ownedCardId) {
    return [body.ownedCardId];
  }

  if (Array.isArray(body.ownedCardIds)) {
    return body.ownedCardIds;
  }

  return [];
}

async function getClub(req, res, next) {
  try {
    const cooldownStatus = await applyCooldownIfNeeded(req.user);
    const ownedCards = await OwnedCard.find({ userId: req.user._id }).populate("playerId");

    res.json({
      success: true,
      user: buildClubSummary(req.user),
      cooldownStatus,
      collectionSummary: buildCollectionInsights(ownedCards)
    });
  } catch (error) {
    next(error);
  }
}

async function getCollection(req, res, next) {
  try {
    const collection = await OwnedCard.find({ userId: req.user._id })
      .populate("playerId")
      .sort({ acquiredAt: -1 });
    const serializedCollection = collection.map((card) =>
      serializeOwnedCard(card, {
        sellValue: calculateSellValue(card.playerId, card.rarity)
      })
    );

    res.json({
      success: true,
      totalCards: collection.length,
      insights: buildCollectionInsights(collection),
      collection: serializedCollection
    });
  } catch (error) {
    next(error);
  }
}

async function sellCards(req, res, next) {
  try {
    const ownedCardIds = extractOwnedCardIds(req.body);

    const result = await sellOwnedCards(req.user, ownedCardIds);

    res.json({
      success: true,
      message: "Cards sold successfully.",
      soldCount: result.soldCount,
      coinsEarned: result.totalCoinsEarned,
      coins: result.user.coins,
      cooldownStatus: result.cooldownStatus,
      soldCards: result.soldCards.map((card) =>
        serializeOwnedCard(card, {
          sellValue: calculateSellValue(card.playerId, card.rarity)
        })
      )
    });
  } catch (error) {
    next(error);
  }
}

async function claimCoinRefill(req, res, next) {
  try {
    const result = await claimRefill(req.user);

    res.json({
      success: true,
      message: "Coin refill claimed successfully.",
      refillAmount: result.refillAmount,
      coins: result.user.coins,
      cooldownStatus: result.cooldownStatus
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  claimCoinRefill,
  getClub,
  getCollection,
  sellCards
};
