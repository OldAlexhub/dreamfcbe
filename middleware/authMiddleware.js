const jwt = require("jsonwebtoken");

const User = require("../models/User");

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(createError("Not authorized. Missing bearer token.", 401));
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(createError("User not found for this token.", 401));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(createError("Not authorized. Invalid token.", 401));
  }
}

module.exports = {
  protect
};
