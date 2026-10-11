import express from "express";
import dotenv from "dotenv/config";
import morgan from "morgan";
import authRoutes from "./modules/auth/auth.routes.js";
import organizationRoutes from "./modules/organization/organization.routes.js";
import hospitalRoutes from "./modules/hospital/hospital.routes.js";
import doctorRoutes from "./modules/doctor/doctor.routes.js";

const app = express();
const PORT  = process.env.PORT;

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.send(`Server is running on port ${PORT}`);
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/doctors", doctorRoutes);


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
