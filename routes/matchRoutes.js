const express = require("express");

const { simulateUserMatch } = require("../controllers/matchController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/simulate", simulateUserMatch);

module.exports = router;
