const { calculateSellValue } = require("../services/economyService");
const { getActivePacks, openPack } = require("../services/packService");
const buildCollectionInsights = require("../utils/buildCollectionInsights");
const serializeOwnedCard = require("../utils/serializeOwnedCard");

function formatPack(pack) {
  return {
    id: pack._id,
    name: pack.name,
    cost: pack.cost,
    minPlayers: pack.minPlayers,
    maxPlayers: pack.maxPlayers,
    odds: pack.odds,
    active: pack.active
  };
}

async function getPacks(req, res, next) {
  try {
    const packs = await getActivePacks();

    res.json({
      success: true,
      packs: packs.map(formatPack)
    });
  } catch (error) {
    next(error);
  }
}

async function openUserPack(req, res, next) {
  try {
    const result = await openPack(req.user, req.params.packId);
    const pulledCards = result.pulledCards.map((card) =>
      serializeOwnedCard(card, {
        sellValue: calculateSellValue(card.playerId, card.rarity)
      })
    );

    res.json({
      success: true,
      message: `${result.pack.name} opened successfully.`,
      pack: formatPack(result.pack),
      coins: result.user.coins,
      packsOpened: result.user.packsOpened,
      cooldownStatus: result.cooldownStatus,
      pullSummary: {
        ...result.pullSummary,
        playerInsights: buildCollectionInsights(result.pulledCards)
      },
      pulledCards
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPacks,
  openUserPack
};
