const express = require("express");

const { claimCoinRefill, getClub, getCollection, sellCards, updateClubProfile } = require("../controllers/clubController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getClub);
router.get("/collection", getCollection);
router.put("/profile", updateClubProfile);
router.post("/sell", sellCards);
router.post("/claim-refill", claimCoinRefill);

module.exports = router;
