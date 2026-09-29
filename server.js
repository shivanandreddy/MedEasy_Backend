import express from "express";
import dotenv from "dotenv/config";
import morgan from "morgan";
import pool from "./config/db.js";
import authRoutes from "./auth/auth.routes.js";

const app = express();
const PORT  = process.env.PORT;

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.send(`Server is running on port ${PORT}`);
});

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
