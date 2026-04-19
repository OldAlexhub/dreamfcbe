const mongoose = require("mongoose");

const app = require("./app");
const connectDB = require("./config/db");
const { seedDefaultPacks } = require("./services/packService");

const PORT = Number(process.env.PORT) || 5000;

let server;

async function startServer() {
  await connectDB();
  await seedDefaultPacks();

  server = app.listen(PORT, () => {
    console.log(`Dream Squad FC API running on port ${PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            return reject(error);
          }

          return resolve();
        });
      });
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error.message);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  shutdown("unhandledRejection");
});

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
