const express = require("express");

const { claimCoinRefill, getClub, getCollection, sellCards } = require("../controllers/clubController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getClub);
router.get("/collection", getCollection);
router.post("/sell", sellCards);
router.post("/claim-refill", claimCoinRefill);

module.exports = router;
