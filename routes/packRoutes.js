const express = require("express");

const { getPacks, openUserPack } = require("../controllers/packController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getPacks);
router.post("/open/:packId", protect, openUserPack);

module.exports = router;
