import express from "express";

import {
  createDoctor,
  getDoctors,
  getDoctorById,
  getDoctorsByHospital,
  getDoctorsByHospitalAndDepartment,
  updateDoctor,
  updateDoctorStatus,
  deleteDoctor,
} from "./doctor.controller.js";

import { authorize, protect } from "../../middlewares/auth.middlware.js";

const router = express.Router();

// Create Doctor Profile
router.post("/", protect, authorize("admin", "hospital_admin"), createDoctor);

// Get All Doctors
router.get(
  "/",
  protect,
  authorize("admin", "hospital_admin", "doctor", "receptionist"),
  getDoctors,
);

// Get Doctors By Hospital
router.get(
  "/hospital/:hospital_id",
  protect,
  authorize("admin", "hospital_admin", "doctor", "receptionist"),
  getDoctorsByHospital,
);

//Get Doctors By Hospital and Department
router.get(
  "/hospital/:hospital_id/department/:department",
  protect,
  authorize("admin", "hospital_admin", "doctor", "receptionist"),
  getDoctorsByHospitalAndDepartment,
);

// Get Doctor By ID
router.get(
  "/:id",
  protect,
  authorize("admin", "hospital_admin", "doctor", "receptionist"),
  getDoctorById,
);

// Update Doctor
router.put("/:id", protect, authorize("admin", "hospital_admin"), updateDoctor);

// Activate / Deactivate Doctor
router.patch(
  "/:id/status",
  protect,
  authorize("admin", "hospital_admin"),
  updateDoctorStatus,
);

// Delete Doctor Profile
router.delete(
  "/:id",
  protect,
  authorize("admin", "hospital_admin"),
  deleteDoctor,
);

export default router;
