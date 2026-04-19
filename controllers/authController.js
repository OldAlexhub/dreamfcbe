const bcrypt = require("bcryptjs");

const Squad = require("../models/Squad");
const User = require("../models/User");
const { applyCooldownIfNeeded } = require("../services/economyService");
const generateToken = require("../utils/generateToken");

function createError(message, statusCode, details) {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (details) {
    error.details = details;
  }

  return error;
}

function normalizeUsername(username) {
  return typeof username === "string" ? username.trim().toLowerCase() : "";
}

function validateAuthInput(username, password) {
  if (!/^[a-z0-9_]{3,20}$/i.test(username)) {
    throw createError(
      "Username must be 3-20 characters and only contain letters, numbers, or underscores.",
      400
    );
  }

  if (typeof password !== "string" || password.length < 6 || password.length > 72) {
    throw createError("Password must be between 6 and 72 characters.", 400);
  }
}

function buildUserResponse(user) {
  return {
    id: user._id,
    username: user.username,
    coins: user.coins,
    coinCooldownUntil: user.coinCooldownUntil,
    packsOpened: user.packsOpened,
    wins: user.wins,
    losses: user.losses
  };
}

async function register(req, res, next) {
  try {
    const username = normalizeUsername(req.body.username);
    const password = req.body.password;

    validateAuthInput(username, password);

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      throw createError("Username is already taken.", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword
    });

    await Squad.create({ userId: user._id });

    const cooldownStatus = await applyCooldownIfNeeded(user);
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      token,
      user: buildUserResponse(user),
      cooldownStatus
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const username = normalizeUsername(req.body.username);
    const password = req.body.password;

    validateAuthInput(username, password);

    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      throw createError("Invalid username or password.", 401);
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      throw createError("Invalid username or password.", 401);
    }

    const cooldownStatus = await applyCooldownIfNeeded(user);
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "Login successful.",
      token,
      user: buildUserResponse(user),
      cooldownStatus
    });
  } catch (error) {
    next(error);
  }
}

async function getCurrentUser(req, res, next) {
  try {
    const cooldownStatus = await applyCooldownIfNeeded(req.user);

    res.json({
      success: true,
      user: buildUserResponse(req.user),
      cooldownStatus
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCurrentUser,
  login,
  register
};
