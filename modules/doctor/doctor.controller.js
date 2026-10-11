import  pool  from "../../config/db.js";

// Create Doctor Profile
export const createDoctor = async (req, res) => {
    try {
        const {
            user_id,
            doctor_code,
            qualification,
            specialization,
            medical_registration_number,
            experience_years,
            consultation_fee
        } = req.body;

        // 1. Validate required fields
        if (!user_id || !doctor_code) {
            return res.status(400).json({
                success: false,
                message: "user_id and doctor_code are required"
            });
        }

        // 2. Check user exists and is a doctor
        const userResult = await pool.query(
            `SELECT
                id,
                hospital_id,
                name,
                email,
                role,
                department,
                status
             FROM users
             WHERE id = $1`,
            [user_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = userResult.rows[0];

        // 3. Make sure the user has doctor role
        if (user.role !== "doctor") {
            return res.status(400).json({
                success: false,
                message: "Selected user is not a doctor"
            });
        }

        // 4. Check whether doctor profile already exists
        const existingDoctor = await pool.query(
            `SELECT id
             FROM doctors
             WHERE user_id = $1
                OR doctor_code = $2`,
            [user_id, doctor_code]
        );

        if (existingDoctor.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Doctor profile already exists"
            });
        }

        // 5. Create doctor profile
        const result = await pool.query(
            `INSERT INTO doctors (
                user_id,
                doctor_code,
                qualification,
                specialization,
                medical_registration_number,
                experience_years,
                consultation_fee
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                user_id,
                doctor_code,
                qualification || null,
                specialization || null,
                medical_registration_number || null,
                experience_years || 0,
                consultation_fee || 0
            ]
        );

        res.status(201).json({
            success: true,
            message: "Doctor created successfully",
            doctor: result.rows[0]
        });

    } catch (error) {
        console.error("Create doctor error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create doctor",
            error: error.message
        });
    }
};

// Get All Doctors
export const getDoctors = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                d.id,
                d.user_id,
                d.doctor_code,
                d.qualification,
                d.specialization,
                d.medical_registration_number,
                d.experience_years,
                d.consultation_fee,
                d.status,
                d.created_at,
                d.updated_at,

                u.name,
                u.email,
                u.phone,
                u.role,
                u.department,
                u.hospital_id

             FROM doctors d

             INNER JOIN users u
                ON d.user_id = u.id

             ORDER BY d.created_at DESC`
        );

        res.status(200).json({
            count: result.rows.length,
            doctors: result.rows
        });

    } catch (error) {
        console.error("Get doctors error:", error);

        res.status(500).json({
            message: "Failed to fetch doctors",
            error: error.message
        });
    }
};


// Get Doctor By ID
export const getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                d.id,
                d.user_id,
                d.doctor_code,
                d.qualification,
                d.specialization,
                d.medical_registration_number,
                d.experience_years,
                d.consultation_fee,
                d.status,
                d.created_at,
                d.updated_at,

                u.name,
                u.email,
                u.phone_number,
                u.user_role,
                u.department_type,
                u.hospital_id

             FROM doctors d

             INNER JOIN users u
                ON d.user_id = u.id

             WHERE d.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        res.status(200).json({
            doctor: result.rows[0]
        });

    } catch (error) {
        console.error("Get doctor error:", error);

        res.status(500).json({
            message: "Failed to fetch doctor",
            error: error.message
        });
    }
};


// Get Doctors By Hospital
export const getDoctorsByHospital = async (req, res) => {
    try {
        const { hospital_id } = req.params;

        const result = await pool.query(
            `SELECT
                d.id,
                d.user_id,
                d.doctor_code,
                d.qualification,
                d.specialization,
                d.medical_registration_number,
                d.experience_years,
                d.consultation_fee,
                d.status,
                d.created_at,
                d.updated_at,

                u.name,
                u.email,
                u.phone_number,
                u.user_role,
                u.department_type,
                u.hospital_id

             FROM doctors d

             INNER JOIN users u
                ON d.user_id = u.id

             WHERE u.hospital_id = $1

             ORDER BY d.created_at DESC`,
            [hospital_id]
        );

        res.status(200).json({
            count: result.rows.length,
            doctors: result.rows
        });

    } catch (error) {
        console.error("Get hospital doctors error:", error);

        res.status(500).json({
            message: "Failed to fetch hospital doctors",
            error: error.message
        });
    }
};

//Get Doctors By Hospital and Department
export const getDoctorsByHospitalAndDepartment = async (req, res) => {
    try {
        const { hospital_id, department } = req.params;

        const result = await pool.query(`SELECT * FROM doctors WHERE hospital_id = $1 AND department = $2 ORDER BY created_at DESC`, [hospital_id, department]);
        res.status(200).json({
            count: result.rows.length,
            doctors: result.rows
        });
    } catch (error) {
        console.error("Get hospital doctors error:", error);

        res.status(500).json({
            message: "Failed to fetch hospital doctors",
            error: error.message
        });
    }
};


// Update Doctor
export const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            doctor_code,
            qualification,
            specialization,
            medical_registration_number,
            experience_years,
            consultation_fee
        } = req.body;

        const result = await pool.query(
            `UPDATE doctors
             SET
                doctor_code = COALESCE($1, doctor_code),
                qualification = COALESCE($2, qualification),
                specialization = COALESCE($3, specialization),
                medical_registration_number =
                    COALESCE($4, medical_registration_number),
                experience_years = COALESCE($5, experience_years),
                consultation_fee = COALESCE($6, consultation_fee),
                updated_at = CURRENT_TIMESTAMP

             WHERE id = $7

             RETURNING *`,
            [
                doctor_code,
                qualification,
                specialization,
                medical_registration_number,
                experience_years,
                consultation_fee,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        res.status(200).json({
            message: "Doctor updated successfully",
            doctor: result.rows[0]
        });

    } catch (error) {
        console.error("Update doctor error:", error);

        res.status(500).json({
            message: "Failed to update doctor",
            error: error.message
        });
    }
};


// Activate / Deactivate Doctor
export const updateDoctorStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (typeof status !== "boolean") {
            return res.status(400).json({
                message: "status must be true or false"
            });
        }

        const result = await pool.query(
            `UPDATE doctors
             SET
                status = $1,
                updated_at = CURRENT_TIMESTAMP

             WHERE id = $2

             RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        res.status(200).json({
            message: status
                ? "Doctor activated successfully"
                : "Doctor deactivated successfully",
            doctor: result.rows[0]
        });

    } catch (error) {
        console.error("Update doctor status error:", error);

        res.status(500).json({
            message: "Failed to update doctor status",
            error: error.message
        });
    }
};


// Delete Doctor Profile
export const deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM doctors
             WHERE id = $1
             RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        res.status(200).json({
            message: "Doctor profile deleted successfully"
        });

    } catch (error) {
        console.error("Delete doctor error:", error);

        res.status(500).json({
            message: "Failed to delete doctor",
            error: error.message
        });
    }
};