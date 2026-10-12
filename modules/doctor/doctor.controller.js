
import pool from "../../config/db.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";

// --------------------------------------------------
// SHARED ERROR HANDLER
// --------------------------------------------------
const handleControllerError = (res, error, operation) => {
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
      message: "A doctor with this code or registration number already exists.",
    });
  }

  if (error.code === "23503") {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "The referenced user or record does not exist.",
    });
  }

  if (error.code === "22P02") {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Invalid ID or field value.",
    });
  }

  console.error(`${operation}:`, error);

  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: `${operation} failed.`,
  });
};

// --------------------------------------------------
// CREATE DOCTOR PROFILE
// POST /api/doctors
// A doctor user must already exist in users.
// --------------------------------------------------
export const createDoctor = async (req, res) => {
  try {
    const {
      user_id,
      doctor_code,
      qualification,
      specialization,
      medical_registration_number,
      experience_years = 0,
      consultation_fee = 0,
      status = true,
    } = req.body;

    if (
      !user_id ||
      typeof doctor_code !== "string" ||
      !doctor_code.trim()
    ) {
      throw new ApiError(
        400,
        "User ID and doctor code are required."
      );
    }

    if (
      !Number.isFinite(Number(experience_years)) ||
      Number(experience_years) < 0
    ) {
      throw new ApiError(
        400,
        "Experience years must be a non-negative number."
      );
    }

    if (
      !Number.isFinite(Number(consultation_fee)) ||
      Number(consultation_fee) < 0
    ) {
      throw new ApiError(
        400,
        "Consultation fee must be a non-negative number."
      );
    }

    if (typeof status !== "boolean") {
      throw new ApiError(
        400,
        "Status must be true or false."
      );
    }

    // Verify that the user exists and has the doctor role.
    const userResult = await pool.query(
      `SELECT id, hospital_id, role
       FROM users
       WHERE id = $1`,
      [user_id]
    );

    if (userResult.rows.length === 0) {
      throw new ApiError(404, "Doctor user account not found.");
    }

    if (userResult.rows[0].role !== "doctor") {
      throw new ApiError(
        400,
        "The selected user must have the doctor role."
      );
    }

    // Prevent creating another profile for the same user.
    const existingProfile = await pool.query(
      `SELECT id
       FROM doctors
       WHERE user_id = $1`,
      [user_id]
    );

    if (existingProfile.rows.length > 0) {
      throw new ApiError(
        409,
        "A doctor profile already exists for this user."
      );
    }

    const result = await pool.query(
      `INSERT INTO doctors (
        user_id,
        doctor_code,
        qualification,
        specialization,
        medical_registration_number,
        experience_years,
        consultation_fee,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        user_id,
        doctor_code.trim().toUpperCase(),
        qualification?.trim() || null,
        specialization?.trim() || null,
        medical_registration_number?.trim() || null,
        Number(experience_years),
        Number(consultation_fee),
        status,
      ]
    );

    return res.status(201).json(
      new ApiResponse(
        201,
        "Doctor profile created successfully.",
        result.rows[0]
      )
    );
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Create doctor"
    );
  }
};

// --------------------------------------------------
// GET ALL DOCTORS
// GET /api/doctors
// --------------------------------------------------
export const getDoctors = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         d.*,
         u.name,
         u.email,
         u.phone,
         u.role,
         u.status AS user_status,
         u.hospital_id,
         h.name AS hospital_name,
         u.department_id,
         dep.name AS department_name,
         dep.code AS department_code
       FROM doctors d
       INNER JOIN users u
         ON u.id = d.user_id
       LEFT JOIN hospitals h
         ON h.id = u.hospital_id
       LEFT JOIN departments dep
         ON dep.id = u.department_id
        AND dep.hospital_id = u.hospital_id
       ORDER BY d.created_at DESC`
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        "Doctors fetched successfully.",
        {
          count: result.rows.length,
          doctors: result.rows,
        }
      )
    );
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Get doctors"
    );
  }
};

// --------------------------------------------------
// GET DOCTOR BY ID
// GET /api/doctors/:id
// :id is the doctors table profile ID.
// --------------------------------------------------
export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         d.*,
         u.name,
         u.email,
         u.phone,
         u.role,
         u.status AS user_status,
         u.hospital_id,
         h.name AS hospital_name,
         u.department_id,
         dep.name AS department_name,
         dep.code AS department_code
       FROM doctors d
       INNER JOIN users u
         ON u.id = d.user_id
       LEFT JOIN hospitals h
         ON h.id = u.hospital_id
       LEFT JOIN departments dep
         ON dep.id = u.department_id
        AND dep.hospital_id = u.hospital_id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Doctor not found.");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        "Doctor fetched successfully.",
        result.rows[0]
      )
    );
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Get doctor"
    );
  }
};

// --------------------------------------------------
// GET DOCTORS BY HOSPITAL
// GET /api/doctors/hospital/:hospitalId
// --------------------------------------------------
export const getDoctorsByHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;

    const result = await pool.query(
      `SELECT
         d.*,
         u.name,
         u.email,
         u.phone,
         u.status AS user_status,
         u.hospital_id,
         h.name AS hospital_name,
         u.department_id,
         dep.name AS department_name,
         dep.code AS department_code
       FROM doctors d
       INNER JOIN users u
         ON u.id = d.user_id
       LEFT JOIN hospitals h
         ON h.id = u.hospital_id
       LEFT JOIN departments dep
         ON dep.id = u.department_id
        AND dep.hospital_id = u.hospital_id
       WHERE u.hospital_id = $1
       ORDER BY u.name ASC`,
      [hospitalId]
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        "Hospital doctors fetched successfully.",
        {
          count: result.rows.length,
          doctors: result.rows,
        }
      )
    );
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Get doctors by hospital"
    );
  }
};

// --------------------------------------------------
// GET DOCTORS BY HOSPITAL AND DEPARTMENT
// GET /api/doctors/hospital/:hospitalId/department/:departmentId
// --------------------------------------------------
export const getDoctorsByHospitalAndDepartment = async (
  req,
  res
) => {
  try {
    const { hospitalId, departmentId } = req.params;

    const result = await pool.query(
      `SELECT
         d.*,
         u.name,
         u.email,
         u.phone,
         u.status AS user_status,
         u.hospital_id,
         h.name AS hospital_name,
         u.department_id,
         dep.name AS department_name,
         dep.code AS department_code
       FROM doctors d
       INNER JOIN users u
         ON u.id = d.user_id
       INNER JOIN departments dep
         ON dep.id = u.department_id
        AND dep.hospital_id = u.hospital_id
       LEFT JOIN hospitals h
         ON h.id = u.hospital_id
       WHERE u.hospital_id = $1
         AND u.department_id = $2
       ORDER BY u.name ASC`,
      [hospitalId, departmentId]
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        "Department doctors fetched successfully.",
        {
          count: result.rows.length,
          doctors: result.rows,
        }
      )
    );
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Get doctors by department"
    );
  }
};

// --------------------------------------------------
// UPDATE DOCTOR PROFILE
// PUT /api/doctors/:id
// --------------------------------------------------
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      doctor_code,
      qualification,
      specialization,
      medical_registration_number,
      experience_years,
      consultation_fee,
      status,
    } = req.body;

    const allowedFields = [
      "doctor_code",
      "qualification",
      "specialization",
      "medical_registration_number",
      "experience_years",
      "consultation_fee",
      "status",
    ];

    const hasUpdate = allowedFields.some(
      (field) => req.body[field] !== undefined
    );

    if (!hasUpdate) {
      throw new ApiError(
        400,
        "Provide at least one field to update."
      );
    }

    if (
      doctor_code !== undefined &&
      (typeof doctor_code !== "string" || !doctor_code.trim())
    ) {
      throw new ApiError(
        400,
        "Doctor code cannot be empty."
      );
    }

    if (
      experience_years !== undefined &&
      (!Number.isFinite(Number(experience_years)) ||
        Number(experience_years) < 0)
    ) {
      throw new ApiError(
        400,
        "Experience years must be a non-negative number."
      );
    }

    if (
      consultation_fee !== undefined &&
      (!Number.isFinite(Number(consultation_fee)) ||
        Number(consultation_fee) < 0)
    ) {
      throw new ApiError(
        400,
        "Consultation fee must be a non-negative number."
      );
    }

    if (
      status !== undefined &&
      typeof status !== "boolean"
    ) {
      throw new ApiError(
        400,
        "Status must be true or false."
      );
    }

    const result = await pool.query(
      `UPDATE doctors
       SET
         doctor_code = COALESCE($1, doctor_code),
         qualification = CASE
           WHEN $2::boolean THEN $3
           ELSE qualification
         END,
         specialization = CASE
           WHEN $4::boolean THEN $5
           ELSE specialization
         END,
         medical_registration_number = CASE
           WHEN $6::boolean THEN $7
           ELSE medical_registration_number
         END,
         experience_years = COALESCE($8, experience_years),
         consultation_fee = COALESCE($9, consultation_fee),
         status = COALESCE($10, status),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        doctor_code === undefined
          ? null
          : doctor_code.trim().toUpperCase(),
        qualification !== undefined,
        qualification === undefined
          ? null
          : qualification?.trim() || null,
        specialization !== undefined,
        specialization === undefined
          ? null
          : specialization?.trim() || null,
        medical_registration_number !== undefined,
        medical_registration_number === undefined
          ? null
          : medical_registration_number?.trim() || null,
        experience_years === undefined
          ? null
          : Number(experience_years),
        consultation_fee === undefined
          ? null
          : Number(consultation_fee),
        status ?? null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Doctor not found.");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        "Doctor updated successfully.",
        result.rows[0]
      )
    );
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Update doctor"
    );
  }
};

// --------------------------------------------------
// UPDATE DOCTOR STATUS
// PATCH /api/doctors/:id/status
// Body: { "status": false }
// --------------------------------------------------
export const updateDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (typeof status !== "boolean") {
      throw new ApiError(
        400,
        "Status must be true or false."
      );
    }

    const result = await pool.query(
      `UPDATE doctors
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Doctor not found.");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        "Doctor status updated successfully.",
        result.rows[0]
      )
    );
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Update doctor status"
    );
  }
};

// --------------------------------------------------
// DELETE DOCTOR PROFILE
// DELETE /api/doctors/:id
// This does not delete the linked users record.
// --------------------------------------------------
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM doctors
       WHERE id = $1
       RETURNING id, user_id, doctor_code`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Doctor not found.");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        "Doctor profile deleted successfully.",
        result.rows[0]
      )
    );
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Delete doctor"
    );
  }
};
