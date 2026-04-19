require("dotenv").config();

const cors = require("cors");
const express = require("express");

const authRoutes = require("./routes/authRoutes");
const clubRoutes = require("./routes/clubRoutes");
const packRoutes = require("./routes/packRoutes");
const squadRoutes = require("./routes/squadRoutes");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Dream Squad FC backend is running."
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/packs", packRoutes);
app.use("/api/club", clubRoutes);
app.use("/api/squad", squadRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
