function weightedRandom(weights) {
  if (!weights || typeof weights !== "object" || Array.isArray(weights)) {
    throw new Error("Weights must be provided as an object.");
  }

  const entries = Object.entries(weights).filter(([, value]) => Number(value) > 0);

  if (!entries.length) {
    throw new Error("At least one positive weight is required.");
  }

  const totalWeight = entries.reduce((sum, [, value]) => sum + Number(value), 0);
  const randomValue = Math.random() * totalWeight;

  let cumulativeWeight = 0;

  for (const [key, value] of entries) {
    cumulativeWeight += Number(value);

    if (randomValue <= cumulativeWeight) {
      return key;
    }
  }

  return entries[entries.length - 1][0];
}

module.exports = weightedRandom;
