const OwnedCard = require("../models/OwnedCard");
const { calculateSellValue } = require("../services/economyService");
const { FORMATION_OPTIONS, autoBuildSquad, getSquad, updateSquad } = require("../services/squadService");
const serializeOwnedCard = require("../utils/serializeOwnedCard");
const serializeSquad = require("../utils/serializeSquad");

async function getUserSquad(req, res, next) {
  try {
    const squad = await getSquad(req.user._id);
    const ownedCards = await OwnedCard.find({ userId: req.user._id })
      .populate("playerId")
      .sort({ isInSquad: -1, acquiredAt: -1 });

    res.json({
      success: true,
      formations: FORMATION_OPTIONS,
      squad: serializeSquad(squad),
      availableCards: ownedCards.map((card) =>
        serializeOwnedCard(card, {
          sellValue: calculateSellValue(card.playerId, card.rarity)
        })
      )
    });
  } catch (error) {
    next(error);
  }
}

async function updateUserSquad(req, res, next) {
  try {
    const squad = await updateSquad(req.user._id, req.body);

    res.json({
      success: true,
      message: "Squad updated successfully.",
      squad: serializeSquad(squad)
    });
  } catch (error) {
    next(error);
  }
}

async function autoBuildUserSquad(req, res, next) {
  try {
    const squad = await autoBuildSquad(req.user._id);

    res.json({
      success: true,
      message: "Squad auto-built successfully.",
      squad: serializeSquad(squad)
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  autoBuildUserSquad,
  getUserSquad,
  updateUserSquad
};
