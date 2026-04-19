const { simulateMatch } = require("../services/matchService");

async function simulateUserMatch(req, res, next) {
  try {
    const result = await simulateMatch(req.user, req.body || {});

    res.json({
      success: true,
      message: "Match simulation complete.",
      ...result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  simulateUserMatch
};
