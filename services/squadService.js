const OwnedCard = require("../models/OwnedCard");
const Squad = require("../models/Squad");
const calculateSquadOverall = require("../utils/calculateSquadOverall");
const {
  calculateGameScore,
  getPlayerOverall,
  getPositionFitBonus,
  getPositionGroup,
  getPrimaryPosition,
  getRoleStrength
} = require("../utils/playerData");

const FORMATION_PATTERN = /^\d-\d-\d(?:-\d)?$/;
const FORMATION_OPTIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3"];

function createError(message, statusCode, details) {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (details) {
    error.details = details;
  }

  return error;
}

function normalizeIds(ids) {
  return [...new Set(ids.map((id) => String(id)))];
}

function validateFormation(formation) {
  if (!formation) {
    return;
  }

  if (typeof formation !== "string" || !FORMATION_PATTERN.test(formation.trim()) || !FORMATION_OPTIONS.includes(formation.trim())) {
    throw createError("Formation must look like 4-3-3 or 4-2-3-1.", 400);
  }
}

function getFormationRoleSlots(formation) {
  const fallbackFormation = "4-3-3";
  const valueToParse = typeof formation === "string" && formation.trim() ? formation.trim() : fallbackFormation;
  const parts = valueToParse.split("-").map((value) => Number(value));

  if (parts.length < 3 || parts.some((value) => !Number.isInteger(value) || value < 1)) {
    return getFormationRoleSlots(fallbackFormation);
  }

  const defenders = parts[0];
  const attackers = parts[parts.length - 1];
  const midfielders = parts.slice(1, -1).reduce((sum, value) => sum + value, 0);

  return [
    "GK",
    ...Array(defenders).fill("DEF"),
    ...Array(midfielders).fill("MID"),
    ...Array(attackers).fill("ATT")
  ];
}

function scoreCardForRole(card, roleGroup) {
  const player = card.playerId;
  const positionGroup = getPositionGroup(getPrimaryPosition(player));
  const fitBonus = getPositionFitBonus(player, roleGroup);
  const roleStrength = getRoleStrength(player, roleGroup);
  const versatilityBonus = positionGroup === roleGroup ? 8 : 0;

  return calculateGameScore(player) + roleStrength * 2 + fitBonus * 12 + versatilityBonus;
}

async function getOrCreateSquad(userId) {
  let squad = await Squad.findOne({ userId });

  if (!squad) {
    squad = await Squad.create({ userId });
  }

  return squad;
}

async function populateSquad(squadId) {
  return Squad.findById(squadId).populate({
    path: "startingXI",
    populate: {
      path: "playerId"
    }
  });
}

async function syncSquadFlags(userId, selectedIds) {
  await OwnedCard.updateMany({ userId }, { $set: { isInSquad: false } });

  if (selectedIds.length) {
    await OwnedCard.updateMany(
      {
        userId,
        _id: { $in: selectedIds }
      },
      { $set: { isInSquad: true } }
    );
  }
}

async function getSquad(userId) {
  const squad = await getOrCreateSquad(userId);
  return populateSquad(squad._id);
}

async function updateSquad(userId, payload) {
  const squad = await getOrCreateSquad(userId);
  const hasStartingXI = Object.prototype.hasOwnProperty.call(payload, "startingXI");
  const startingXI = hasStartingXI ? payload.startingXI : squad.startingXI.map((id) => String(id));

  if (hasStartingXI && !Array.isArray(startingXI)) {
    throw createError("startingXI must be an array of owned card ids.", 400);
  }

  const uniqueIds = normalizeIds(startingXI);

  if (uniqueIds.length !== startingXI.length) {
    throw createError("startingXI cannot contain duplicate cards.", 400);
  }

  if (uniqueIds.length > 11) {
    throw createError("startingXI cannot contain more than 11 cards.", 400);
  }

  validateFormation(payload.formation);

  const ownedCards = uniqueIds.length
    ? await OwnedCard.find({
        _id: { $in: uniqueIds },
        userId
      }).populate("playerId")
    : [];

  if (ownedCards.length !== uniqueIds.length) {
    throw createError("One or more selected cards do not belong to this user.", 403);
  }

  if (payload.formation) {
    squad.formation = payload.formation.trim();
  }

  squad.startingXI = uniqueIds;
  squad.overall = calculateSquadOverall(ownedCards);
  await squad.save();

  await syncSquadFlags(userId, uniqueIds);

  return populateSquad(squad._id);
}

async function autoBuildSquad(userId) {
  const ownedCards = await OwnedCard.find({ userId }).populate("playerId");
  const squad = await getOrCreateSquad(userId);
  const roleSlots = getFormationRoleSlots(squad.formation);
  const selectedCards = [];
  const usedIds = new Set();

  const availableCards = ownedCards.filter((card) => card.playerId);

  for (const roleGroup of roleSlots) {
    const candidates = availableCards
      .filter((card) => !usedIds.has(String(card._id)))
      .sort((leftCard, rightCard) => {
        const scoreDifference = scoreCardForRole(rightCard, roleGroup) - scoreCardForRole(leftCard, roleGroup);

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        return getPlayerOverall(rightCard.playerId) - getPlayerOverall(leftCard.playerId);
      });

    const bestCandidate = candidates[0];

    if (!bestCandidate) {
      continue;
    }

    selectedCards.push(bestCandidate);
    usedIds.add(String(bestCandidate._id));
  }

  const remainingCards = availableCards
    .filter((card) => !usedIds.has(String(card._id)))
    .sort((leftCard, rightCard) => calculateGameScore(rightCard.playerId) - calculateGameScore(leftCard.playerId));

  while (selectedCards.length < 11 && remainingCards.length) {
    const nextCard = remainingCards.shift();
    selectedCards.push(nextCard);
    usedIds.add(String(nextCard._id));
  }

  const selectedIds = selectedCards.map((card) => card._id);

  squad.startingXI = selectedIds;
  squad.overall = calculateSquadOverall(selectedCards);
  await squad.save();

  await syncSquadFlags(userId, selectedIds);

  return populateSquad(squad._id);
}

module.exports = {
  FORMATION_OPTIONS,
  autoBuildSquad,
  getFormationRoleSlots,
  getSquad,
  updateSquad
};
