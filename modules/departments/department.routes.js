
import express from "express";

import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  getDepartmentsByHospital,
  updateDepartment,
  updateDepartmentStatus,
  deleteDepartment,
} from "./department.controller.js";

const router = express.Router();

router.post("/", createDepartment);
router.get("/", getDepartments);

// Keep this route before /:id for clarity
router.get("/hospital/:hospitalId", getDepartmentsByHospital);

router.get("/:id", getDepartmentById);
router.put("/:id", updateDepartment);
router.patch("/:id/status", updateDepartmentStatus);
router.delete("/:id", deleteDepartment);

export default router;
