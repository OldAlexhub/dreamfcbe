const { getMatchCost } = require("../services/matchService");

async function getConfig(req, res, next) {
  try {
    res.json({
      success: true,
      matchCost: getMatchCost(),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getConfig,
};
