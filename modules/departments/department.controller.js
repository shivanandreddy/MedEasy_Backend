
import pool from "../../config/db.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";

// --------------------------------------------------
// Shared error handler
// --------------------------------------------------
const handleControllerError = (res, error, operation) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      statusCode: error.statusCode,
      message: error.message,
    });
  }

  // Duplicate department name or code
  if (error.code === "23505") {
    return res.status(409).json({
      success: false,
      statusCode: 409,
      message:
        "A department with this name or code already exists in this hospital.",
    });
  }

  // Foreign key constraint violation
  if (error.code === "23503") {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message:
        "The referenced hospital or department is invalid, or the department is being used by another record.",
    });
  }

  // Invalid UUID or PostgreSQL data type
  if (error.code === "22P02") {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Invalid ID or field value.",
    });
  }

  console.error(`${operation} error:`, error);

  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: `${operation} failed.`,
  });
};

// --------------------------------------------------
// Validate UUID format
// --------------------------------------------------
const isValidUUID = (value) => {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
};

// --------------------------------------------------
// Validate department status
// --------------------------------------------------
const validateStatus = (status) => {
  if (
    typeof status !== "string" ||
    !["ACTIVE", "INACTIVE"].includes(status.toUpperCase())
  ) {
    throw new ApiError(
      400,
      "Status must be either ACTIVE or INACTIVE."
    );
  }

  return status.toUpperCase();
};

// --------------------------------------------------
// CREATE DEPARTMENT
// POST /api/departments
// --------------------------------------------------
export const createDepartment = async (req, res) => {
  try {
    let { hospital_id, name, code, description, status = "ACTIVE" } =
      req.body;

    hospital_id =
      typeof hospital_id === "string" ? hospital_id.trim() : hospital_id;
    name = typeof name === "string" ? name.trim() : name;
    code = typeof code === "string" ? code.trim().toUpperCase() : code;

    if (!hospital_id || !name || !code) {
      throw new ApiError(
        400,
        "hospital_id, name, and code are required."
      );
    }

    if (!isValidUUID(hospital_id)) {
      throw new ApiError(400, "Invalid hospital_id.");
    }

    if (name.length > 150) {
      throw new ApiError(
        400,
        "Department name cannot exceed 150 characters."
      );
    }

    if (code.length > 30) {
      throw new ApiError(
        400,
        "Department code cannot exceed 30 characters."
      );
    }

    if (description !== undefined && description !== null) {
      if (typeof description !== "string") {
        throw new ApiError(400, "Description must be a string.");
      }

      description = description.trim() || null;
    }

    status = validateStatus(status);

    // Confirm that the hospital exists
    const hospitalResult = await pool.query(
      `SELECT id
       FROM hospitals
       WHERE id = $1`,
      [hospital_id]
    );

    if (hospitalResult.rows.length === 0) {
      throw new ApiError(404, "Hospital not found.");
    }

    const result = await pool.query(
      `INSERT INTO departments
        (hospital_id, name, code, description, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [hospital_id, name, code, description ?? null, status]
    );

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          "Department created successfully.",
          result.rows[0]
        )
      );
  } catch (error) {
    return handleControllerError(res, error, "Create department");
  }
};

// --------------------------------------------------
// GET ALL DEPARTMENTS
// GET /api/departments
// --------------------------------------------------
export const getDepartments = async (req, res) => {
  try {
    const { status, hospital_id } = req.query;

    const conditions = [];
    const values = [];

    if (hospital_id) {
      if (!isValidUUID(hospital_id)) {
        throw new ApiError(400, "Invalid hospital_id.");
      }

      values.push(hospital_id);
      conditions.push(`d.hospital_id = $${values.length}`);
    }

    if (status) {
      const normalizedStatus = validateStatus(status);
      values.push(normalizedStatus);
      conditions.push(`d.status = $${values.length}`);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const result = await pool.query(
      `SELECT
          d.*,
          h.name AS hospital_name,
          h.code AS hospital_code
       FROM departments d
       INNER JOIN hospitals h ON h.id = d.hospital_id
       ${whereClause}
       ORDER BY d.name ASC`,
      values
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        "Departments retrieved successfully.",
        result.rows
      )
    );
  } catch (error) {
    return handleControllerError(res, error, "Get departments");
  }
};

// --------------------------------------------------
// GET DEPARTMENT BY ID
// GET /api/departments/:id
// --------------------------------------------------
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new ApiError(400, "Invalid department ID.");
    }

    const result = await pool.query(
      `SELECT
          d.*,
          h.name AS hospital_name,
          h.code AS hospital_code
       FROM departments d
       INNER JOIN hospitals h ON h.id = d.hospital_id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Department not found.");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        "Department retrieved successfully.",
        result.rows[0]
      )
    );
  } catch (error) {
    return handleControllerError(res, error, "Get department");
  }
};

// --------------------------------------------------
// GET DEPARTMENTS BY HOSPITAL
// GET /api/departments/hospital/:hospitalId
// --------------------------------------------------
export const getDepartmentsByHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;

    if (!isValidUUID(hospitalId)) {
      throw new ApiError(400, "Invalid hospital ID.");
    }

    const hospitalResult = await pool.query(
      `SELECT id, name, code
       FROM hospitals
       WHERE id = $1`,
      [hospitalId]
    );

    if (hospitalResult.rows.length === 0) {
      throw new ApiError(404, "Hospital not found.");
    }

    const result = await pool.query(
      `SELECT *
       FROM departments
       WHERE hospital_id = $1
       ORDER BY name ASC`,
      [hospitalId]
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        "Hospital departments retrieved successfully.",
        result.rows
      )
    );
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Get departments by hospital"
    );
  }
};

// --------------------------------------------------
// UPDATE DEPARTMENT
// PUT /api/departments/:id
// --------------------------------------------------
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new ApiError(400, "Invalid department ID.");
    }

    const existingResult = await pool.query(
      `SELECT *
       FROM departments
       WHERE id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      throw new ApiError(404, "Department not found.");
    }

    const existing = existingResult.rows[0];

    const {
      hospital_id,
      name,
      code,
      description,
      status,
    } = req.body;

    const nextHospitalId =
      hospital_id === undefined ? existing.hospital_id : hospital_id;

    const nextName =
      name === undefined
        ? existing.name
        : typeof name === "string"
          ? name.trim()
          : name;

    const nextCode =
      code === undefined
        ? existing.code
        : typeof code === "string"
          ? code.trim().toUpperCase()
          : code;

    const nextDescription =
      description === undefined
        ? existing.description
        : description === null || description.trim() === ""
          ? null
          : description.trim();

    const nextStatus =
      status === undefined ? existing.status : validateStatus(status);

    if (!isValidUUID(nextHospitalId)) {
      throw new ApiError(400, "Invalid hospital_id.");
    }

    if (typeof nextName !== "string" || !nextName) {
      throw new ApiError(400, "Department name cannot be empty.");
    }

    if (nextName.length > 150) {
      throw new ApiError(
        400,
        "Department name cannot exceed 150 characters."
      );
    }

    if (typeof nextCode !== "string" || !nextCode) {
      throw new ApiError(400, "Department code cannot be empty.");
    }

    if (nextCode.length > 30) {
      throw new ApiError(
        400,
        "Department code cannot exceed 30 characters."
      );
    }

    if (
      nextDescription !== null &&
      typeof nextDescription !== "string"
    ) {
      throw new ApiError(400, "Description must be a string or null.");
    }

    const hospitalResult = await pool.query(
      `SELECT id
       FROM hospitals
       WHERE id = $1`,
      [nextHospitalId]
    );

    if (hospitalResult.rows.length === 0) {
      throw new ApiError(404, "Hospital not found.");
    }

    const result = await pool.query(
      `UPDATE departments
       SET hospital_id = $1,
           name = $2,
           code = $3,
           description = $4,
           status = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        nextHospitalId,
        nextName,
        nextCode,
        nextDescription,
        nextStatus,
        id,
      ]
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        "Department updated successfully.",
        result.rows[0]
      )
    );
  } catch (error) {
    return handleControllerError(res, error, "Update department");
  }
};

// --------------------------------------------------
// UPDATE DEPARTMENT STATUS
// PATCH /api/departments/:id/status
// --------------------------------------------------
export const updateDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;

    if (!isValidUUID(id)) {
      throw new ApiError(400, "Invalid department ID.");
    }

    if (status === undefined) {
      throw new ApiError(400, "Status is required.");
    }

    status = validateStatus(status);

    const result = await pool.query(
      `UPDATE departments
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Department not found.");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        "Department status updated successfully.",
        result.rows[0]
      )
    );
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Update department status"
    );
  }
};

// --------------------------------------------------
// DELETE DEPARTMENT
// DELETE /api/departments/:id
// --------------------------------------------------
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new ApiError(400, "Invalid department ID.");
    }

    const existingResult = await pool.query(
      `SELECT id
       FROM departments
       WHERE id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      throw new ApiError(404, "Department not found.");
    }

    // The database foreign-key constraints protect departments
    // referenced by users, doctors, or other hospital records.
    await pool.query(
      `DELETE FROM departments
       WHERE id = $1`,
      [id]
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        "Department deleted successfully.",
        { id }
      )
    );
  } catch (error) {
    return handleControllerError(res, error, "Delete department");
  }
};
