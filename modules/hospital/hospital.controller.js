
import pool from "../../config/db.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";

// CREATE HOSPITAL
export const createHospital = async (req, res) => {
  try {
    const {
      organization_id,
      name,
      code,
      address,
      phone,
      email,
      status = "ACTIVE",
    } = req.body;

    const normalizedName =
      typeof name === "string" ? name.trim() : "";

    const normalizedCode =
      typeof code === "string"
        ? code.trim().toUpperCase()
        : "";

    if (!organization_id || !normalizedName || !normalizedCode) {
      throw new ApiError(
        400,
        "Organization ID, name and code are required"
      );
    }

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      throw new ApiError(
        400,
        "Status must be ACTIVE or INACTIVE"
      );
    }

    // Verify organization
    const organization = await pool.query(
      `SELECT id
       FROM organizations
       WHERE id = $1`,
      [organization_id]
    );

    if (organization.rows.length === 0) {
      throw new ApiError(404, "Organization not found");
    }

    // Check duplicate hospital code
    const existingHospital = await pool.query(
      `SELECT id
       FROM hospitals
       WHERE UPPER(code) = $1`,
      [normalizedCode]
    );

    if (existingHospital.rows.length > 0) {
      throw new ApiError(409, "Hospital code already exists");
    }

    const result = await pool.query(
      `INSERT INTO hospitals (
        organization_id,
        name,
        code,
        address,
        phone,
        email,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        organization_id,
        normalizedName,
        normalizedCode,
        address?.trim() || null,
        phone?.trim() || null,
        email?.trim().toLowerCase() || null,
        status,
      ]
    );

    return res.status(201).json(
      new ApiResponse(
        201,
        "Hospital created successfully",
        result.rows[0]
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        statusCode: error.statusCode,
        message: error.message,
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: "Hospital code already exists",
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid organization ID",
      });
    }

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid organization ID format",
      });
    }

    console.error("Create hospital error:", error);

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to create hospital",
    });
  }
};

// GET ALL HOSPITALS
export const getHospitals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         h.*,
         o.name AS organization_name,
         o.code AS organization_code
       FROM hospitals h
       INNER JOIN organizations o
         ON h.organization_id = o.id
       ORDER BY h.created_at DESC`
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        "Hospitals fetched successfully",
        {
          count: result.rows.length,
          hospitals: result.rows,
        }
      )
    );
  } catch (error) {
    console.error("Get hospitals error:", error);

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch hospitals",
    });
  }
};

// GET HOSPITAL BY ID
export const getHospitalById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         h.*,
         o.name AS organization_name,
         o.code AS organization_code
       FROM hospitals h
       INNER JOIN organizations o
         ON h.organization_id = o.id
       WHERE h.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Hospital not found");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        "Hospital fetched successfully",
        result.rows[0]
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        statusCode: error.statusCode,
        message: error.message,
      });
    }

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid hospital ID format",
      });
    }

    console.error("Get hospital error:", error);

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch hospital",
    });
  }
};

// UPDATE HOSPITAL
export const updateHospital = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      organization_id,
      name,
      code,
      address,
      phone,
      email,
      status,
    } = req.body;

    if (
      organization_id === undefined &&
      name === undefined &&
      code === undefined &&
      address === undefined &&
      phone === undefined &&
      email === undefined &&
      status === undefined
    ) {
      throw new ApiError(
        400,
        "Provide at least one field to update"
      );
    }

    const normalizedName =
      typeof name === "string" ? name.trim() : name;

    const normalizedCode =
      typeof code === "string"
        ? code.trim().toUpperCase()
        : code;

    if (
      name !== undefined &&
      (typeof normalizedName !== "string" || !normalizedName)
    ) {
      throw new ApiError(400, "Hospital name cannot be empty");
    }

    if (
      code !== undefined &&
      (typeof normalizedCode !== "string" || !normalizedCode)
    ) {
      throw new ApiError(400, "Hospital code cannot be empty");
    }

    if (
      status !== undefined &&
      !["ACTIVE", "INACTIVE"].includes(status)
    ) {
      throw new ApiError(
        400,
        "Status must be ACTIVE or INACTIVE"
      );
    }

    // Validate the new organization if supplied
    if (organization_id !== undefined) {
      if (!organization_id) {
        throw new ApiError(
          400,
          "Organization ID cannot be empty"
        );
      }

      const organization = await pool.query(
        `SELECT id
         FROM organizations
         WHERE id = $1`,
        [organization_id]
      );

      if (organization.rows.length === 0) {
        throw new ApiError(404, "Organization not found");
      }
    }

    const result = await pool.query(
      `UPDATE hospitals
       SET
         organization_id = COALESCE($1, organization_id),
         name = COALESCE($2, name),
         code = COALESCE($3, code),
         address = CASE
           WHEN $4::boolean THEN $5
           ELSE address
         END,
         phone = CASE
           WHEN $6::boolean THEN $7
           ELSE phone
         END,
         email = CASE
           WHEN $8::boolean THEN $9
           ELSE email
         END,
         status = COALESCE($10, status),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        organization_id ?? null,
        normalizedName ?? null,
        normalizedCode ?? null,
        address !== undefined,
        address === undefined ? null : address,
        phone !== undefined,
        phone === undefined ? null : phone,
        email !== undefined,
        email === undefined
          ? null
          : typeof email === "string"
            ? email.trim().toLowerCase() || null
            : email,
        status ?? null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Hospital not found");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        "Hospital updated successfully",
        result.rows[0]
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        statusCode: error.statusCode,
        message: error.message,
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: "Hospital code already exists",
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid organization ID",
      });
    }

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid hospital or organization ID format",
      });
    }

    console.error("Update hospital error:", error);

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to update hospital",
    });
  }
};

// DELETE HOSPITAL
export const deleteHospital = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM hospitals
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Hospital not found");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        "Hospital deleted successfully",
        { id: result.rows[0].id }
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        statusCode: error.statusCode,
        message: error.message,
      });
    }

    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message:
          "Cannot delete hospital because users or other records are linked to it",
      });
    }

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid hospital ID format",
      });
    }

    console.error("Delete hospital error:", error);

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to delete hospital",
    });
  }
};
