const Squad = require("../models/Squad");
const buildCollectionInsights = require("../utils/buildCollectionInsights");
const serializeSquad = require("../utils/serializeSquad");
const {
  calculateEffectiveOverall,
  getNaturalRoleGroup,
  getPlayerName,
  getRoleStrength,
} = require("../utils/playerData");

const OPPONENT_NAMES = [
  "Rising Meteors",
  "Harbor Hawks",
  "Turbo Tigers",
  "Solar Strikers",
  "Neon Lions",
  "Skyline Rockets",
  "Storm Academy",
  "Future Falcons",
];
const PROCESSING_STAGES = [
  "Analyzing lineup",
  "Calculating chemistry",
  "Scouting the opponent",
  "Simulating key chances",
  "Rendering match result",
];
const DIFFICULTY_SETTINGS = {
  friendly: { minOffset: -8, maxOffset: 1 },
  balanced: { minOffset: -3, maxOffset: 5 },
  elite: { minOffset: 4, maxOffset: 11 },
};

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getConfiguredNumber(value, fallbackValue) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

function getMatchWinCoins() {
  return Math.max(0, getConfiguredNumber(process.env.MATCH_WIN_COINS, 120));
}

function getMatchLossCoins() {
  return Math.max(0, getConfiguredNumber(process.env.MATCH_LOSS_COINS, 45));
}

function getMatchCost() {
  return Math.max(0, getConfiguredNumber(process.env.MATCH_COST, 10));
}

function getFormationRoleSlots(formation) {
  const parts = String(formation || "4-3-3")
    .split("-")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  const defenders = parts[0] || 4;
  const attackers = parts[parts.length - 1] || 3;
  const midfielders =
    parts.length > 2
      ? parts.slice(1, -1).reduce((sum, value) => sum + value, 0)
      : 3;

  return [
    "GK",
    ...Array(defenders).fill("DEF"),
    ...Array(midfielders).fill("MID"),
    ...Array(attackers).fill("ATT"),
  ];
}

function calculateTacticalFit(cards, formation) {
  const roleSlots = getFormationRoleSlots(formation);
  const openCards = [...cards];
  let totalFit = 0;

  roleSlots.forEach((roleGroup) => {
    const candidates = openCards
      .map((card, index) => ({
        index,
        fit: getRoleStrength(card.playerId, roleGroup),
      }))
      .sort((leftValue, rightValue) => rightValue.fit - leftValue.fit);
    const bestCandidate = candidates[0];

    if (!bestCandidate) {
      return;
    }

    totalFit += bestCandidate.fit;
    openCards.splice(bestCandidate.index, 1);
  });

  return cards.length
    ? Math.round(totalFit / Math.max(roleSlots.length, cards.length))
    : 0;
}

function buildTeamProfile(cards, formation) {
  const safeCards = Array.isArray(cards)
    ? cards.filter((card) => card && card.playerId)
    : [];
  const chemistry = buildCollectionInsights(safeCards).chemistryScore;
  const tacticalFit = calculateTacticalFit(safeCards, formation);
  const attack = Math.round(
    safeCards.reduce(
      (sum, card) => sum + getRoleStrength(card.playerId, "ATT"),
      0,
    ) / Math.max(safeCards.length, 1),
  );
  const midfield = Math.round(
    safeCards.reduce(
      (sum, card) => sum + getRoleStrength(card.playerId, "MID"),
      0,
    ) / Math.max(safeCards.length, 1),
  );
  const defense = Math.round(
    safeCards.reduce(
      (sum, card) => sum + getRoleStrength(card.playerId, "DEF"),
      0,
    ) / Math.max(safeCards.length, 1),
  );
  const goalkeepingCandidates = safeCards
    .filter((card) => getNaturalRoleGroup(card.playerId) === "GK")
    .map((card) => getRoleStrength(card.playerId, "GK"));
  const goalkeeper = goalkeepingCandidates.length
    ? Math.max(...goalkeepingCandidates)
    : Math.round(
        safeCards.reduce(
          (sum, card) => sum + getRoleStrength(card.playerId, "GK"),
          0,
        ) / Math.max(safeCards.length, 1),
      );
  const squadOverall = Math.round(
    safeCards.reduce(
      (sum, card) => sum + calculateEffectiveOverall(card.playerId),
      0,
    ) / Math.max(safeCards.length, 1),
  );
  const teamPower = Math.round(
    squadOverall * 0.46 +
      chemistry * 0.18 +
      tacticalFit * 0.14 +
      attack * 0.1 +
      midfield * 0.05 +
      defense * 0.04 +
      goalkeeper * 0.03,
  );

  return {
    chemistry,
    tacticalFit,
    attack,
    midfield,
    defense,
    goalkeeper,
    squadOverall,
    teamPower,
  };
}

function buildOpponentProfile(teamProfile, difficulty) {
  const settings =
    DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.balanced;
  const powerOffset = randomIntegerBetween(
    settings.minOffset,
    settings.maxOffset,
  );
  const opponentPower = clamp(teamProfile.teamPower + powerOffset, 48, 97);
  const opponentOverall = clamp(
    teamProfile.squadOverall + Math.round(powerOffset * 0.7),
    46,
    95,
  );
  const chemistry = clamp(
    teamProfile.chemistry + randomIntegerBetween(-10, 8),
    42,
    94,
  );

  return {
    name: OPPONENT_NAMES[randomIntegerBetween(0, OPPONENT_NAMES.length - 1)],
    formation: ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2"][
      randomIntegerBetween(0, 3)
    ],
    overall: opponentOverall,
    chemistry,
    teamPower: opponentPower,
  };
}

function poissonishGoals(expectedValue) {
  const safeValue = clamp(expectedValue, 0.15, 4.3);
  let goals = 0;
  let threshold = safeValue;

  while (Math.random() < threshold / 4.6 && goals < 6) {
    goals += 1;
    threshold *= 0.58;
  }

  return goals;
}

function pickEventPlayer(cards, preferredRole) {
  const weightedCards = cards
    .filter((card) => card && card.playerId)
    .map((card) => {
      const roleBoost =
        getNaturalRoleGroup(card.playerId) === preferredRole ? 16 : 0;
      const score =
        calculateEffectiveOverall(card.playerId, preferredRole) + roleBoost;

      return {
        card,
        score,
      };
    })
    .sort((leftCard, rightCard) => rightCard.score - leftCard.score);
  const topSlice = weightedCards.slice(0, Math.min(5, weightedCards.length));

  if (!topSlice.length) {
    return null;
  }

  return topSlice[randomIntegerBetween(0, topSlice.length - 1)].card;
}

function buildEvents(cards, yourScore, opponentScore, teamName, opponentName) {
  const events = [];
  const usedMinutes = new Set();

  function nextMinute() {
    let minute = randomIntegerBetween(8, 88);

    while (usedMinutes.has(minute)) {
      minute = randomIntegerBetween(8, 88);
    }

    usedMinutes.add(minute);
    return minute;
  }

  for (let index = 0; index < yourScore; index += 1) {
    const scorer =
      pickEventPlayer(cards, "ATT") || pickEventPlayer(cards, "MID");

    events.push({
      minute: nextMinute(),
      side: "home",
      teamName,
      type: "goal",
      playerName: scorer ? getPlayerName(scorer.playerId) : "Dream Squad Hero",
    });
  }

  for (let index = 0; index < opponentScore; index += 1) {
    events.push({
      minute: nextMinute(),
      side: "away",
      teamName: opponentName,
      type: "goal",
      playerName: [
        "Ace Finisher",
        "Playmaker Pro",
        "Captain Strike",
        "Shadow Runner",
      ][randomIntegerBetween(0, 3)],
    });
  }

  return events.sort(
    (leftEvent, rightEvent) => leftEvent.minute - rightEvent.minute,
  );
}

function buildStandoutPlayers(cards, yourScore, result) {
  return cards
    .map((card) => {
      const playerName = getPlayerName(card.playerId);
      const attackStrength = getRoleStrength(card.playerId, "ATT");
      const midfieldStrength = getRoleStrength(card.playerId, "MID");
      const defenseStrength = getRoleStrength(card.playerId, "DEF");
      const roleGroup = getNaturalRoleGroup(card.playerId);
      const impactScore =
        calculateEffectiveOverall(card.playerId) +
        (roleGroup === "ATT"
          ? attackStrength * 0.18
          : roleGroup === "MID"
            ? midfieldStrength * 0.14
            : defenseStrength * 0.12) +
        (result === "win" ? 8 : result === "draw" ? 2 : 0) +
        (yourScore ? 3 : 0);

      return {
        playerName,
        roleGroup,
        rating: clamp(Math.round(impactScore / 12), 6, 10),
        reason:
          roleGroup === "ATT"
            ? "Led the front line with sharp finishing and movement."
            : roleGroup === "MID"
              ? "Kept the tempo high and linked every phase."
              : roleGroup === "DEF"
                ? "Closed space quickly and stabilized the shape."
                : "Protected the goal in big moments.",
      };
    })
    .sort((leftPlayer, rightPlayer) => rightPlayer.rating - leftPlayer.rating)
    .slice(0, 3);
}

function buildRecap(teamName, opponentName, result, yourScore, opponentScore) {
  if (result === "win") {
    return `${teamName} beat ${opponentName} ${yourScore}-${opponentScore} with better chemistry and cleaner finishing.`;
  }

  if (result === "loss") {
    return `${opponentName} edged ${teamName} ${opponentScore}-${yourScore} after taking better advantage of the big moments.`;
  }

  return `${teamName} and ${opponentName} matched each other stride for stride in a ${yourScore}-${opponentScore} draw.`;
}

async function simulateMatch(user, options = {}) {
  const difficulty =
    typeof options.difficulty === "string"
      ? options.difficulty.toLowerCase()
      : "balanced";
  const squad = await Squad.findOne({ userId: user._id }).populate({
    path: "startingXI",
    populate: {
      path: "playerId",
    },
  });

  if (
    !squad ||
    !Array.isArray(squad.startingXI) ||
    squad.startingXI.length < 7
  ) {
    throw createError("Build a bigger squad before simulating a match.", 400);
  }

  const cards = squad.startingXI.filter((card) => card && card.playerId);
  const teamName = user.teamName || `${user.username} FC`;
  const teamProfile = buildTeamProfile(cards, squad.formation);
  const opponentProfile = buildOpponentProfile(teamProfile, difficulty);
  const opponentName =
    typeof options.opponentName === "string" && options.opponentName.trim()
      ? options.opponentName.trim().slice(0, 32)
      : opponentProfile.name;
  const adjustedTeamAttack =
    teamProfile.attack + Math.round(teamProfile.chemistry * 0.08);
  const adjustedOpponentAttack =
    opponentProfile.teamPower + Math.round(opponentProfile.chemistry * 0.05);
  const expectedGoalsFor =
    0.78 +
    (adjustedTeamAttack - opponentProfile.teamPower) / 21 +
    teamProfile.tacticalFit / 180;
  const expectedGoalsAgainst =
    0.72 +
    (adjustedOpponentAttack -
      (teamProfile.defense + teamProfile.goalkeeper) / 2) /
      25;
  let yourScore = poissonishGoals(expectedGoalsFor);
  let opponentScore = poissonishGoals(expectedGoalsAgainst);

  if (difficulty === "elite" && yourScore === opponentScore) {
    opponentScore += 1;
  }

  if (difficulty === "friendly" && opponentScore > yourScore + 2) {
    yourScore += 1;
  }

  const result =
    yourScore > opponentScore
      ? "win"
      : yourScore < opponentScore
        ? "loss"
        : "draw";
  const playCost = getMatchCost();
  const coinsBeforeMatch = Number(user.coins || 0);

  if (coinsBeforeMatch < playCost) {
    throw createError("You do not have enough coins to play a match.", 400, {
      required: playCost,
      coinsBeforeMatch,
    });
  }

  // Deduct play cost up-front
  user.coins = Math.max(0, coinsBeforeMatch - playCost);
  let coinChange = -playCost;

  if (result === "win") {
    user.wins += 1;
    const winReward = getMatchWinCoins();
    user.coins += winReward;
    coinChange += winReward;
  } else if (result === "loss") {
    user.losses += 1;
    const lossPenalty = Math.min(user.coins, getMatchLossCoins());
    user.coins = Math.max(0, user.coins - lossPenalty);
    coinChange -= lossPenalty;
  }

  await user.save();

  const events = buildEvents(
    cards,
    yourScore,
    opponentScore,
    teamName,
    opponentName,
  );

  return {
    result,
    processingStages: PROCESSING_STAGES,
    coinChange,
    economy: {
      coinsBeforeMatch,
      coinsAfterMatch: user.coins,
      winReward: getMatchWinCoins(),
      lossPenalty: getMatchLossCoins(),
    },
    match: {
      simulatedAt: new Date(),
      difficulty,
      teamName,
      opponentName,
      formation: squad.formation,
      opponentFormation: opponentProfile.formation,
      score: {
        home: yourScore,
        away: opponentScore,
      },
      recap: buildRecap(
        teamName,
        opponentName,
        result,
        yourScore,
        opponentScore,
      ),
      teamProfile,
      opponentProfile,
      events,
      standoutPlayers: buildStandoutPlayers(cards, yourScore, result),
    },
    squad: serializeSquad(squad),
    user: {
      id: user._id,
      username: user.username,
      teamName,
      wins: user.wins,
      losses: user.losses,
      coins: user.coins,
    },
  };
}

module.exports = {
  simulateMatch,
  getMatchCost,
};
