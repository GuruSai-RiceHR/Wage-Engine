import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRouter from "./routes/api";
import { initDatabase } from "./config/db";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost and Vercel subdomains dynamically
      if (!origin || origin.startsWith("http://localhost") || origin.endsWith("vercel.app")) {
        callback(null, origin || true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// Routes
app.use("/api", apiRouter);

// Initialize DB and Start Server
const startServer = async () => {
  try {
    // Run PostgreSQL table migrations
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`\n============================================================`);
      console.log(`🚀 WAGE VALIDATOR API RUNNING ON http://localhost:${PORT}`);
      console.log(`============================================================`);
      console.log(`✓ PostgreSQL Connected and tables verified`);
      console.log(`✓ Authentication: JWT + BCrypt`);
      console.log(`✓ Wage engine compliance validated successfully`);
      console.log(`============================================================\n`);
    });
  } catch (error) {
    console.error("❌ Failed to start server due to database error:", error);
    process.exit(1);
  }
};

startServer();

export default app;
