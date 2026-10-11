import  pool  from "../../config/db.js";

// CREATE ORGANIZATION
export const createOrganization = async (req, res) => {
    try {
        const { name, code, status = "ACTIVE" } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                success: false,
                message: "Name and code are required",
            });
        }

        const existingOrganization = await pool.query(
            `SELECT id FROM organizations WHERE code = $1`,
            [code]
        );

        if (existingOrganization.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Organization code already exists",
            });
        }

        const result = await pool.query(
            `INSERT INTO organizations
                (name, code, status)
             VALUES
                ($1, $2, $3)
             RETURNING *`,
            [name, code, status]
        );

        res.status(201).json({
            success: true,
            message: "Organization created successfully",
            data: result.rows[0],
        });

    } catch (error) {
        console.error("Create organization error:", error);

        res.status(500).json({
            success: false,
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

        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows,
        });

    } catch (error) {
        console.error("Get organizations error:", error);

        res.status(500).json({
            success: false,
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
            return res.status(404).json({
                success: false,
                message: "Organization not found",
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0],
        });

    } catch (error) {
        console.error("Get organization error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch organization",
        });
    }
};


// UPDATE ORGANIZATION
export const updateOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, status } = req.body;

        const result = await pool.query(
            `UPDATE organizations
             SET
                name = COALESCE($1, name),
                code = COALESCE($2, code),
                status = COALESCE($3, status),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [name, code, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Organization not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Organization updated successfully",
            data: result.rows[0],
        });

    } catch (error) {
        console.error("Update organization error:", error);

        res.status(500).json({
            success: false,
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
            return res.status(404).json({
                success: false,
                message: "Organization not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Organization deleted successfully",
        });

    } catch (error) {
        console.error("Delete organization error:", error);

        res.status(500).json({
            success: false,
            message:
                "Cannot delete organization. Make sure no hospitals are linked to it.",
        });
    }
};