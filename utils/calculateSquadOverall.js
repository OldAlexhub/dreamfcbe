const { calculateEffectiveOverall } = require("./playerData");

function getOverallFromCard(card) {
  if (!card) {
    return 0;
  }

  const player = card.playerId || card.player || null;
  return player ? calculateEffectiveOverall(player) : 0;
}

function calculateSquadOverall(cards) {
  if (!Array.isArray(cards) || !cards.length) {
    return 0;
  }

  const overalls = cards
    .map(getOverallFromCard)
    .filter((overall) => Number.isFinite(overall) && overall > 0);

  if (!overalls.length) {
    return 0;
  }

  const total = overalls.reduce((sum, overall) => sum + overall, 0);
  return Math.round(total / overalls.length);
}

module.exports = calculateSquadOverall;
