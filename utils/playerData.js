const POSITION_GROUPS = {
  GK: "GK",
  CB: "DEF",
  LCB: "DEF",
  RCB: "DEF",
  LB: "DEF",
  RB: "DEF",
  LWB: "DEF",
  RWB: "DEF",
  SW: "DEF",
  CDM: "MID",
  CM: "MID",
  CAM: "MID",
  LM: "MID",
  RM: "MID",
  LCM: "MID",
  RCM: "MID",
  LDM: "MID",
  RDM: "MID",
  LAM: "MID",
  RAM: "MID",
  LW: "ATT",
  RW: "ATT",
  ST: "ATT",
  CF: "ATT",
  LF: "ATT",
  RF: "ATT",
  LS: "ATT",
  RS: "ATT"
};
const ROLE_GROUPS = ["GK", "DEF", "MID", "ATT"];
const ROLE_WEIGHT_MAP = {
  GK: {
    overall: 0.16,
    gk: 0.58,
    reactions: 0.12,
    composure: 0.08,
    physic: 0.06
  },
  DEF: {
    overall: 0.23,
    defending: 0.3,
    physic: 0.18,
    pace: 0.12,
    passing: 0.05,
    dribbling: 0.03,
    reactions: 0.05,
    composure: 0.04
  },
  MID: {
    overall: 0.22,
    passing: 0.24,
    dribbling: 0.17,
    pace: 0.11,
    shooting: 0.08,
    defending: 0.08,
    physic: 0.05,
    reactions: 0.03,
    composure: 0.02
  },
  ATT: {
    overall: 0.22,
    shooting: 0.26,
    pace: 0.18,
    dribbling: 0.17,
    passing: 0.11,
    physic: 0.03,
    reactions: 0.02,
    composure: 0.01
  }
};

function toNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function pickFirstNumber(source, keys) {
  for (const key of keys) {
    const value = toNumber(source && source[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function pickFirstText(source, keys) {
  for (const key of keys) {
    const value = source && source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function average(values) {
  const validValues = values.filter((value) => value !== null);

  if (!validValues.length) {
    return null;
  }

  const total = validValues.reduce((sum, value) => sum + value, 0);
  return Math.round(total / validValues.length);
}

function averagePlayerStats(player, keys) {
  return average(keys.map((key) => pickFirstNumber(player, [key])));
}

function parsePositions(rawValue) {
  if (Array.isArray(rawValue)) {
    return [...new Set(rawValue.map((value) => String(value).trim().toUpperCase()).filter(Boolean))];
  }

  if (typeof rawValue === "string") {
    return [...new Set(rawValue.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean))];
  }

  return [];
}

function getPlayerPositions(player) {
  return parsePositions((player && (player.positions || player.player_positions)) || "");
}

function getPrimaryPosition(player) {
  const [primaryPosition] = getPlayerPositions(player);
  return primaryPosition || null;
}

function getPositionGroup(position) {
  return POSITION_GROUPS[position] || null;
}

function getPlayerPositionGroups(player) {
  return [...new Set(getPlayerPositions(player).map((position) => getPositionGroup(position)).filter(Boolean))];
}

function getNaturalRoleGroup(player) {
  return getPositionGroup(getPrimaryPosition(player)) || "MID";
}

function deriveAgeFromBirthDate(birthDate) {
  if (!birthDate) {
    return null;
  }

  const parsedDate = new Date(birthDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - parsedDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > parsedDate.getMonth() ||
    (today.getMonth() === parsedDate.getMonth() && today.getDate() >= parsedDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function getPlayerName(player) {
  return pickFirstText(player, ["name", "short_name", "full_name", "long_name"]) || "Unknown Player";
}

function getPlayerFullName(player) {
  return pickFirstText(player, ["full_name", "long_name", "name", "short_name"]) || "Unknown Player";
}

function getPlayerNationality(player) {
  return pickFirstText(player, ["nationality_name", "nationality"]);
}

function getPlayerClubName(player) {
  return pickFirstText(player, ["club_name", "club"]);
}

function getPlayerLeagueName(player) {
  return pickFirstText(player, ["league_name", "league"]);
}

function getPlayerOverall(player) {
  return (
    pickFirstNumber(player, ["overall", "overall_rating"]) ||
    average([
      getPlayerPace(player),
      getPlayerShooting(player),
      getPlayerPassing(player),
      getPlayerDribbling(player),
      getPlayerDefending(player),
      getPlayerPhysic(player)
    ]) ||
    0
  );
}

function getPlayerPotential(player) {
  return pickFirstNumber(player, ["potential"]) || 0;
}

function getPlayerPace(player) {
  return pickFirstNumber(player, ["pace"]) || averagePlayerStats(player, ["acceleration", "sprint_speed"]) || 0;
}

function getPlayerShooting(player) {
  return (
    pickFirstNumber(player, ["shooting"]) ||
    averagePlayerStats(player, ["finishing", "shot_power", "long_shots", "volleys", "penalties"]) ||
    0
  );
}

function getPlayerPassing(player) {
  return (
    pickFirstNumber(player, ["passing"]) ||
    averagePlayerStats(player, ["short_passing", "long_passing", "vision", "crossing", "curve", "freekick_accuracy"]) ||
    0
  );
}

function getPlayerDribbling(player) {
  return (
    pickFirstNumber(player, ["dribbling"]) ||
    averagePlayerStats(player, ["dribbling", "ball_control", "agility", "balance", "reactions", "composure"]) ||
    0
  );
}

function getPlayerDefending(player) {
  return (
    pickFirstNumber(player, ["defending"]) ||
    averagePlayerStats(player, ["interceptions", "standing_tackle", "sliding_tackle", "marking", "heading_accuracy"]) ||
    0
  );
}

function getPlayerPhysic(player) {
  return (
    pickFirstNumber(player, ["physic"]) ||
    averagePlayerStats(player, ["strength", "stamina", "jumping", "aggression"]) ||
    0
  );
}

function getPlayerAge(player) {
  return pickFirstNumber(player, ["age"]) || deriveAgeFromBirthDate(pickFirstText(player, ["birth_date"])) || null;
}

function getMarketValueEuro(player) {
  return pickFirstNumber(player, ["value_eur", "value_euro"]) || 0;
}

function getWageEuro(player) {
  return pickFirstNumber(player, ["wage_eur", "wage_euro"]) || 0;
}

function getReleaseClauseEuro(player) {
  return pickFirstNumber(player, ["release_clause_eur", "release_clause_euro"]) || 0;
}

function getWeakFoot(player) {
  return pickFirstNumber(player, ["weak_foot", "weak_foot_1_5"]) || 0;
}

function getSkillMoves(player) {
  return pickFirstNumber(player, ["skill_moves", "skill_moves_1_5"]) || 0;
}

function getInternationalReputation(player) {
  return pickFirstNumber(player, ["international_reputation", "international_reputation_1_5"]) || 0;
}

function getGoalkeepingScore(player) {
  return (
    average([
      pickFirstNumber(player, ["gk_diving", "goalkeeping_diving"]),
      pickFirstNumber(player, ["gk_handling", "goalkeeping_handling"]),
      pickFirstNumber(player, ["gk_kicking", "goalkeeping_kicking"]),
      pickFirstNumber(player, ["gk_positioning", "goalkeeping_positioning"]),
      pickFirstNumber(player, ["gk_reflexes", "goalkeeping_reflexes"])
    ]) || 0
  );
}

function getPlayerImageUrl(player) {
  return (
    pickFirstText(player, [
      "image_url",
      "imageUrl",
      "photo_url",
      "photoUrl",
      "player_face_url",
      "playerFaceUrl",
      "headshot_url",
      "headshotUrl",
      "avatar_url",
      "avatarUrl"
    ]) || null
  );
}

function hasTruthyBooleanishValue(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value > 0;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    return ["true", "1", "yes", "y", "icon"].includes(normalizedValue);
  }

  return false;
}

function containsIconText(value) {
  return typeof value === "string" && /\bicon\b/i.test(value);
}

function isIconPlayer(player) {
  if (!player) {
    return false;
  }

  const directFlag = [
    player.isIcon,
    player.is_icon,
    player.isDreamIcon,
    player.dream_icon,
    player.icon_card
  ].some((value) => hasTruthyBooleanishValue(value));

  if (directFlag) {
    return true;
  }

  return [
    pickFirstText(player, ["specialEdition", "special_edition"]),
    pickFirstText(player, ["cardDesign", "card_design"]),
    pickFirstText(player, ["rarity", "rarity_tier"]),
    pickFirstText(player, ["cardType", "card_type"]),
    pickFirstText(player, ["cardSeries", "card_series"])
  ].some((value) => containsIconText(value));
}

function getPlayerCardRarity(player) {
  if (!player) {
    return "common";
  }

  if (isIconPlayer(player)) {
    return "icon";
  }

  const overall = getPlayerOverall(player);

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

function getPlayerCardDesign(player) {
  return pickFirstText(player, ["cardDesign", "card_design"]) || getPlayerCardRarity(player);
}

function getPlayerSpecialEdition(player) {
  if (!player) {
    return null;
  }

  return (
    pickFirstText(player, ["specialEdition", "special_edition", "cardSeries", "card_series"]) ||
    (isIconPlayer(player) ? "Icon" : null)
  );
}

function buildRoleStatMap(player) {
  return {
    overall: getPlayerOverall(player),
    pace: getPlayerPace(player),
    shooting: getPlayerShooting(player),
    passing: getPlayerPassing(player),
    dribbling: getPlayerDribbling(player),
    defending: getPlayerDefending(player),
    physic: getPlayerPhysic(player),
    gk: getGoalkeepingScore(player),
    reactions: pickFirstNumber(player, ["reactions"]) || 0,
    composure: pickFirstNumber(player, ["composure"]) || 0
  };
}

function computeRoleWeightedScore(player, roleGroup) {
  const weights = ROLE_WEIGHT_MAP[roleGroup] || ROLE_WEIGHT_MAP.MID;
  const stats = buildRoleStatMap(player);
  let total = 0;

  Object.entries(weights).forEach(([key, weight]) => {
    total += (stats[key] || 0) * weight;
  });

  return Math.round(total);
}

function getPositionFitBonus(player, roleGroup) {
  const positions = getPlayerPositions(player);

  if (!positions.length) {
    return 0;
  }

  const primaryGroup = getPositionGroup(positions[0]);

  if (primaryGroup === roleGroup) {
    return 20;
  }

  if (positions.some((position) => getPositionGroup(position) === roleGroup)) {
    return 12;
  }

  if (roleGroup === "ATT" && positions.some((position) => ["CAM", "LM", "RM"].includes(position))) {
    return 6;
  }

  if (roleGroup === "MID" && positions.some((position) => ["LW", "RW", "CF"].includes(position))) {
    return 6;
  }

  if (roleGroup === "DEF" && positions.some((position) => ["CDM"].includes(position))) {
    return 4;
  }

  return 0;
}

function calculateEffectiveOverall(player, roleGroup = getNaturalRoleGroup(player)) {
  const rawOverall = getPlayerOverall(player);
  const weightedScore = computeRoleWeightedScore(player, roleGroup);
  const naturalRole = getNaturalRoleGroup(player);
  const fitBonus = getPositionFitBonus(player, roleGroup);
  const naturalRoleBonus = roleGroup === naturalRole ? 2 : 0;
  const adjustedScore = Math.round((weightedScore + rawOverall) / 2 + fitBonus * 0.18 + naturalRoleBonus);

  return Math.max(1, adjustedScore);
}

function getRoleScoreBreakdown(player) {
  return ROLE_GROUPS.reduce((scores, roleGroup) => {
    scores[roleGroup] = calculateEffectiveOverall(player, roleGroup);
    return scores;
  }, {});
}

function getBestRoleGroup(player) {
  const positionGroups = getPlayerPositionGroups(player);
  const candidateGroups = positionGroups.length ? positionGroups : ROLE_GROUPS;

  return candidateGroups.reduce(
    (bestGroup, roleGroup) => {
      const score = calculateEffectiveOverall(player, roleGroup);

      if (score > bestGroup.score) {
        return {
          roleGroup,
          score
        };
      }

      return bestGroup;
    },
    {
      roleGroup: getNaturalRoleGroup(player),
      score: calculateEffectiveOverall(player, getNaturalRoleGroup(player))
    }
  );
}

function getRoleStrength(player, roleGroup) {
  return calculateEffectiveOverall(player, roleGroup);
}

function calculateGameScore(player) {
  const rawOverall = getPlayerOverall(player);
  const bestRole = getBestRoleGroup(player);
  const potential = getPlayerPotential(player);
  const marketValue = getMarketValueEuro(player);
  const marketBonus = marketValue > 0 ? Math.min(14, Math.round(Math.log10(marketValue + 1))) : 0;

  return Math.round(
    bestRole.score * 4.5 +
      rawOverall * 1.8 +
      potential * 1.4 +
      getInternationalReputation(player) * 6 +
      getSkillMoves(player) * 2 +
      getWeakFoot(player) +
      marketBonus
  );
}

function buildPlayerProfile(player) {
  if (!player) {
    return null;
  }

  const positions = getPlayerPositions(player);
  const primaryPosition = positions[0] || null;
  const naturalRole = getNaturalRoleGroup(player);
  const bestRole = getBestRoleGroup(player);
  const rawOverall = getPlayerOverall(player);
  const effectiveOverall = calculateEffectiveOverall(player, naturalRole);

  return {
    id: player._id || null,
    name: getPlayerName(player),
    fullName: getPlayerFullName(player),
    birthDate: pickFirstText(player, ["birth_date"]) || null,
    age: getPlayerAge(player),
    nationality: getPlayerNationality(player) || null,
    clubName: getPlayerClubName(player) || null,
    leagueName: getPlayerLeagueName(player) || null,
    imageUrl: getPlayerImageUrl(player),
    rarityTier: getPlayerCardRarity(player),
    cardDesign: getPlayerCardDesign(player),
    specialEdition: getPlayerSpecialEdition(player),
    isIcon: isIconPlayer(player),
    positions,
    primaryPosition,
    positionGroup: getPositionGroup(primaryPosition),
    overall: effectiveOverall,
    rawOverall,
    effectiveOverall,
    naturalRole,
    bestRole: bestRole.roleGroup,
    roleScores: getRoleScoreBreakdown(player),
    potential: getPlayerPotential(player),
    preferredFoot: pickFirstText(player, ["preferred_foot"]) || null,
    weakFoot: getWeakFoot(player) || null,
    skillMoves: getSkillMoves(player) || null,
    internationalReputation: getInternationalReputation(player) || null,
    bodyType: pickFirstText(player, ["body_type"]) || null,
    heightCm: pickFirstNumber(player, ["height_cm"]),
    weightKg: pickFirstNumber(player, ["weight_kg", "weight_kgs"]),
    faceStats: {
      pace: getPlayerPace(player),
      shooting: getPlayerShooting(player),
      passing: getPlayerPassing(player),
      dribbling: getPlayerDribbling(player),
      defending: getPlayerDefending(player),
      physic: getPlayerPhysic(player)
    },
    technicalStats: {
      finishing: pickFirstNumber(player, ["finishing"]),
      shotPower: pickFirstNumber(player, ["shot_power"]),
      longShots: pickFirstNumber(player, ["long_shots"]),
      vision: pickFirstNumber(player, ["vision"]),
      shortPassing: pickFirstNumber(player, ["short_passing"]),
      longPassing: pickFirstNumber(player, ["long_passing"]),
      ballControl: pickFirstNumber(player, ["ball_control"]),
      composure: pickFirstNumber(player, ["composure"])
    },
    movementStats: {
      acceleration: pickFirstNumber(player, ["acceleration"]),
      sprintSpeed: pickFirstNumber(player, ["sprint_speed"]),
      agility: pickFirstNumber(player, ["agility"]),
      balance: pickFirstNumber(player, ["balance"]),
      reactions: pickFirstNumber(player, ["reactions"])
    },
    defensiveStats: {
      interceptions: pickFirstNumber(player, ["interceptions"]),
      standingTackle: pickFirstNumber(player, ["standing_tackle"]),
      slidingTackle: pickFirstNumber(player, ["sliding_tackle"]),
      marking: pickFirstNumber(player, ["marking"]),
      headingAccuracy: pickFirstNumber(player, ["heading_accuracy"])
    },
    physicalStats: {
      strength: pickFirstNumber(player, ["strength"]),
      stamina: pickFirstNumber(player, ["stamina"]),
      jumping: pickFirstNumber(player, ["jumping"]),
      aggression: pickFirstNumber(player, ["aggression"])
    },
    goalkeepingStats: {
      diving: pickFirstNumber(player, ["gk_diving", "goalkeeping_diving"]),
      handling: pickFirstNumber(player, ["gk_handling", "goalkeeping_handling"]),
      kicking: pickFirstNumber(player, ["gk_kicking", "goalkeeping_kicking"]),
      positioning: pickFirstNumber(player, ["gk_positioning", "goalkeeping_positioning"]),
      reflexes: pickFirstNumber(player, ["gk_reflexes", "goalkeeping_reflexes"])
    },
    market: {
      valueEuro: getMarketValueEuro(player),
      wageEuro: getWageEuro(player),
      releaseClauseEuro: getReleaseClauseEuro(player)
    },
    gameScore: calculateGameScore(player)
  };
}

module.exports = {
  buildPlayerProfile,
  calculateEffectiveOverall,
  calculateGameScore,
  getBestRoleGroup,
  getGoalkeepingScore,
  getInternationalReputation,
  getPlayerCardDesign,
  getPlayerCardRarity,
  getMarketValueEuro,
  getNaturalRoleGroup,
  getPlayerAge,
  getPlayerClubName,
  getPlayerDefending,
  getPlayerDribbling,
  getPlayerImageUrl,
  getPlayerLeagueName,
  getPlayerName,
  getPlayerNationality,
  getPlayerOverall,
  getPlayerPassing,
  getPlayerPace,
  getPlayerPhysic,
  getPlayerPositions,
  getPlayerPotential,
  getPlayerPositionGroups,
  getPlayerShooting,
  getPositionFitBonus,
  getPositionGroup,
  getPrimaryPosition,
  getRoleScoreBreakdown,
  getRoleStrength,
  getSkillMoves,
  getWeakFoot,
  getPlayerSpecialEdition,
  isIconPlayer
};
