const {
  getPlayerAge,
  getPlayerClubName,
  getPlayerLeagueName,
  getPlayerNationality,
  getPlayerOverall,
  getPlayerPotential,
  getPrimaryPosition,
  getPositionGroup
} = require("./playerData");

function tally(values) {
  return values.reduce((counts, value) => {
    if (!value) {
      return counts;
    }

    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function topEntries(counts, limit = 5) {
  return Object.entries(counts)
    .sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1] || leftEntry[0].localeCompare(rightEntry[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function average(values) {
  const validValues = values.filter((value) => Number.isFinite(value) && value > 0);

  if (!validValues.length) {
    return 0;
  }

  const total = validValues.reduce((sum, value) => sum + value, 0);
  return Math.round(total / validValues.length);
}

function buildChemistryScore(cards) {
  if (!Array.isArray(cards) || cards.length < 2) {
    return 0;
  }

  let chemistryPoints = 0;
  let maxPoints = 0;

  for (let index = 0; index < cards.length; index += 1) {
    const leftPlayer = cards[index].playerId || cards[index].player;

    for (let nestedIndex = index + 1; nestedIndex < cards.length; nestedIndex += 1) {
      const rightPlayer = cards[nestedIndex].playerId || cards[nestedIndex].player;

      maxPoints += 6;

      if (!leftPlayer || !rightPlayer) {
        continue;
      }

      if (getPlayerClubName(leftPlayer) && getPlayerClubName(leftPlayer) === getPlayerClubName(rightPlayer)) {
        chemistryPoints += 3;
      }

      if (
        getPlayerNationality(leftPlayer) &&
        getPlayerNationality(leftPlayer) === getPlayerNationality(rightPlayer)
      ) {
        chemistryPoints += 2;
      }

      if (getPlayerLeagueName(leftPlayer) && getPlayerLeagueName(leftPlayer) === getPlayerLeagueName(rightPlayer)) {
        chemistryPoints += 1;
      }
    }
  }

  if (!maxPoints) {
    return 0;
  }

  return Math.min(100, Math.round((chemistryPoints / maxPoints) * 100));
}

function buildCollectionInsights(cards) {
  const safeCards = Array.isArray(cards) ? cards : [];
  const players = safeCards.map((card) => card.playerId || card.player).filter(Boolean);

  const overallValues = players.map((player) => getPlayerOverall(player));
  const potentialValues = players.map((player) => getPlayerPotential(player));
  const ageValues = players.map((player) => getPlayerAge(player)).filter((value) => value !== null);

  const rarityBreakdown = tally(safeCards.map((card) => card.rarity || "unknown"));
  const positionBreakdown = tally(players.map((player) => getPrimaryPosition(player) || "UNK"));
  const positionGroupBreakdown = tally(players.map((player) => getPositionGroup(getPrimaryPosition(player)) || "UNK"));
  const nationalityBreakdown = tally(players.map((player) => getPlayerNationality(player)));
  const clubBreakdown = tally(players.map((player) => getPlayerClubName(player)));
  const leagueBreakdown = tally(players.map((player) => getPlayerLeagueName(player)));

  return {
    cardCount: safeCards.length,
    squadCount: safeCards.filter((card) => card.isInSquad).length,
    favoriteCount: safeCards.filter((card) => card.isFavorite).length,
    averageOverall: average(overallValues),
    averagePotential: average(potentialValues),
    averageAge: average(ageValues),
    rarityBreakdown,
    positionBreakdown,
    positionGroupBreakdown,
    topNationalities: topEntries(nationalityBreakdown),
    topClubs: topEntries(clubBreakdown),
    topLeagues: topEntries(leagueBreakdown),
    chemistryScore: buildChemistryScore(safeCards)
  };
}

module.exports = buildCollectionInsights;
