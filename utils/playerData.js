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

function getRoleStrength(player, roleGroup) {
  const overall = getPlayerOverall(player);
  const reactions = pickFirstNumber(player, ["reactions"]) || 0;
  const composure = pickFirstNumber(player, ["composure"]) || 0;

  if (roleGroup === "GK") {
    return average([overall, getGoalkeepingScore(player), reactions, composure]) || overall;
  }

  if (roleGroup === "DEF") {
    return average([overall, getPlayerDefending(player), getPlayerPhysic(player), getPlayerPace(player), reactions]) || overall;
  }

  if (roleGroup === "MID") {
    return average([overall, getPlayerPassing(player), getPlayerDribbling(player), getPlayerPhysic(player), reactions, composure]) || overall;
  }

  if (roleGroup === "ATT") {
    return average([overall, getPlayerShooting(player), getPlayerPace(player), getPlayerDribbling(player), getPlayerPassing(player), reactions]) || overall;
  }

  return overall;
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

function calculateGameScore(player) {
  const overall = getPlayerOverall(player);
  const potential = getPlayerPotential(player);
  const marketValue = getMarketValueEuro(player);
  const marketBonus = marketValue > 0 ? Math.min(14, Math.round(Math.log10(marketValue + 1))) : 0;

  return Math.round(
    overall * 4 +
      potential * 1.4 +
      getInternationalReputation(player) * 6 +
      getSkillMoves(player) * 2 +
      getWeakFoot(player) +
      getRoleStrength(player, getPositionGroup(getPrimaryPosition(player)) || "MID") +
      marketBonus
  );
}

function buildPlayerProfile(player) {
  if (!player) {
    return null;
  }

  const positions = getPlayerPositions(player);
  const primaryPosition = positions[0] || null;

  return {
    id: player._id || null,
    name: getPlayerName(player),
    fullName: getPlayerFullName(player),
    birthDate: pickFirstText(player, ["birth_date"]) || null,
    age: getPlayerAge(player),
    nationality: getPlayerNationality(player) || null,
    clubName: getPlayerClubName(player) || null,
    leagueName: getPlayerLeagueName(player) || null,
    positions,
    primaryPosition,
    positionGroup: getPositionGroup(primaryPosition),
    overall: getPlayerOverall(player),
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
  calculateGameScore,
  getGoalkeepingScore,
  getInternationalReputation,
  getMarketValueEuro,
  getPlayerAge,
  getPlayerClubName,
  getPlayerDefending,
  getPlayerDribbling,
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
  getRoleStrength,
  getSkillMoves,
  getWeakFoot
};
