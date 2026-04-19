const { buildPlayerProfile } = require("./playerData");

function serializeOwnedCard(card, options = {}) {
  const player = card ? card.playerId || card.player || null : null;

  return {
    id: card ? card._id : null,
    rarity: card ? card.rarity || null : null,
    acquiredAt: card ? card.acquiredAt || null : null,
    acquiredFromPack: card ? card.acquiredFromPack || null : null,
    isFavorite: Boolean(card && card.isFavorite),
    isInSquad: Boolean(card && card.isInSquad),
    sellValue: Number.isFinite(options.sellValue) ? options.sellValue : null,
    player: buildPlayerProfile(player)
  };
}

module.exports = serializeOwnedCard;
