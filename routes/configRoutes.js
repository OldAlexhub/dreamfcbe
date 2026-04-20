const express = require("express");
const { getConfig } = require("../controllers/configController");

const router = express.Router();

router.get("/", getConfig);

module.exports = router;
