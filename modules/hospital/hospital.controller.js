import  pool  from "../../config/db.js";


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

        if (!organization_id || !name || !code) {
            return res.status(400).json({
                success: false,
                message: "Organization ID, name and code are required",
            });
        }

        // Check organization
        const organization = await pool.query(
            `SELECT id
             FROM organizations
             WHERE id = $1`,
            [organization_id]
        );

        if (organization.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Organization not found",
            });
        }

        // Check hospital code
        const existingHospital = await pool.query(
            `SELECT id
             FROM hospitals
             WHERE code = $1`,
            [code]
        );

        if (existingHospital.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Hospital code already exists",
            });
        }

        const result = await pool.query(
            `INSERT INTO hospitals
                (
                    organization_id,
                    name,
                    code,
                    address,
                    phone,
                    email,
                    status
                )
             VALUES
                ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                organization_id,
                name,
                code,
                address,
                phone,
                email,
                status,
            ]
        );

        res.status(201).json({
            success: true,
            message: "Hospital created successfully",
            data: result.rows[0],
        });

    } catch (error) {
        console.error("Create hospital error:", error);

        res.status(500).json({
            success: false,
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

        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows,
        });

    } catch (error) {
        console.error("Get hospitals error:", error);

        res.status(500).json({
            success: false,
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
            return res.status(404).json({
                success: false,
                message: "Hospital not found",
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0],
        });

    } catch (error) {
        console.error("Get hospital error:", error);

        res.status(500).json({
            success: false,
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

        const result = await pool.query(
            `UPDATE hospitals
             SET
                organization_id = COALESCE($1, organization_id),
                name = COALESCE($2, name),
                code = COALESCE($3, code),
                address = COALESCE($4, address),
                phone = COALESCE($5, phone),
                email = COALESCE($6, email),
                status = COALESCE($7, status),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $8
             RETURNING *`,
            [
                organization_id,
                name,
                code,
                address,
                phone,
                email,
                status,
                id,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hospital not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Hospital updated successfully",
            data: result.rows[0],
        });

    } catch (error) {
        console.error("Update hospital error:", error);

        res.status(500).json({
            success: false,
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
            return res.status(404).json({
                success: false,
                message: "Hospital not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Hospital deleted successfully",
        });

    } catch (error) {
        console.error("Delete hospital error:", error);

        res.status(500).json({
            success: false,
            message:
                "Cannot delete hospital. Make sure no users or other records are linked to it.",
        });
    }
};