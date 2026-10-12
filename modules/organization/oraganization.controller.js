
import pool from "../../config/db.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";

// CREATE ORGANIZATION
export const createOrganization = async (req, res) => {
  try {
    const { name, code, status = "ACTIVE" } = req.body;

    const normalizedName =
      typeof name === "string" ? name.trim() : "";

    const normalizedCode =
      typeof code === "string" ? code.trim().toUpperCase() : "";

    if (!normalizedName || !normalizedCode) {
      throw new ApiError(400, "Name and code are required");
    }

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      throw new ApiError(
        400,
        "Status must be ACTIVE or INACTIVE"
      );
    }

    const existingOrganization = await pool.query(
      `SELECT id
       FROM organizations
       WHERE UPPER(code) = $1`,
      [normalizedCode]
    );

    if (existingOrganization.rows.length > 0) {
      throw new ApiError(
        409,
        "Organization code already exists"
      );
    }

    const result = await pool.query(
      `INSERT INTO organizations (name, code, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [normalizedName, normalizedCode, status]
    );

    return res.status(201).json(
      new ApiResponse(
        201,
        "Organization created successfully",
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
        message: "Organization code already exists",
      });
    }

    console.error("Create organization error:", error);

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to create organization",
    });
  }
};

// GET ALL ORGANIZATIONS
export const getOrganizations = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM organizations
       ORDER BY created_at DESC`
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        "Organizations fetched successfully",
        {
          count: result.rows.length,
          organizations: result.rows,
        }
      )
    );
  } catch (error) {
    console.error("Get organizations error:", error);

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch organizations",
    });
  }
};

// GET ORGANIZATION BY ID
export const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM organizations
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Organization not found");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        "Organization fetched successfully",
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
        message: "Invalid organization ID",
      });
    }

    console.error("Get organization error:", error);

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch organization",
    });
  }
};

// UPDATE ORGANIZATION
export const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, status } = req.body;

    if (
      name === undefined &&
      code === undefined &&
      status === undefined
    ) {
      throw new ApiError(
        400,
        "At least one field is required for update"
      );
    }

    const normalizedName =
      typeof name === "string" ? name.trim() : name;

    const normalizedCode =
      typeof code === "string"
        ? code.trim().toUpperCase()
        : code;

    if (normalizedName !== undefined &&
        (typeof normalizedName !== "string" || !normalizedName)) {
      throw new ApiError(400, "Name cannot be empty");
    }

    if (normalizedCode !== undefined &&
        (typeof normalizedCode !== "string" || !normalizedCode)) {
      throw new ApiError(400, "Code cannot be empty");
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

    const result = await pool.query(
      `UPDATE organizations
       SET
         name = COALESCE($1, name),
         code = COALESCE($2, code),
         status = COALESCE($3, status),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [
        normalizedName ?? null,
        normalizedCode ?? null,
        status ?? null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Organization not found");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        "Organization updated successfully",
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
        message: "Organization code already exists",
      });
    }

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid organization ID",
      });
    }

    console.error("Update organization error:", error);

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to update organization",
    });
  }
};

// DELETE ORGANIZATION
export const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM organizations
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Organization not found");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        "Organization deleted successfully",
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
        message: "Cannot delete organization because hospitals are linked to it",
      });
    }

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid organization ID",
      });
    }

    console.error("Delete organization error:", error);

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to delete organization",
    });
  }
};
