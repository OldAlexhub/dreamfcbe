const express = require("express");

const { autoBuildUserSquad, getUserSquad, updateUserSquad } = require("../controllers/squadController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getUserSquad);
router.put("/", updateUserSquad);
router.post("/auto-build", autoBuildUserSquad);

module.exports = router;
