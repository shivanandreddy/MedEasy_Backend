import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../../config/db.js";


// CREATE USER
export const createUser = async (req, res) => {
    try {
        const {
            hospital_id,
            name,
            email,
            phone,
            password,
            role,
            department,
            status = "ACTIVE",
        } = req.body;

        if (!hospital_id || !name || !email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Hospital ID, name, email and password are required",
            });
        }

        // Check hospital
        const hospital = await pool.query(
            `SELECT id
             FROM hospitals
             WHERE id = $1`,
            [hospital_id]
        );

        if (hospital.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hospital not found",
            });
        }

        // Check email
        const existingUser = await pool.query(
            `SELECT id
             FROM users
             WHERE email = $1`,
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists",
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users
                (
                    hospital_id,
                    name,
                    email,
                    phone,
                    password_hash,
                    role,
                    department,
                    status
                )
             VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING
                id,
                hospital_id,
                name,
                email,
                phone,
                role,
                department,
                status,
                last_login_at,
                created_at,
                updated_at`,
            [
                hospital_id,
                name,
                email,
                phone,
                passwordHash,
                role,
                department,
                status,
            ]
        );

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: result.rows[0],
        });

    } catch (error) {
        console.error("Create user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create user",
        });
    }
};


// GET ALL USERS
export const getUsers = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                u.id,
                u.hospital_id,
                h.name AS hospital_name,
                u.name,
                u.email,
                u.phone,
                u.role,
                u.department,
                u.status,
                u.last_login_at,
                u.created_at,
                u.updated_at
             FROM users u
             INNER JOIN hospitals h
                ON u.hospital_id = h.id
             ORDER BY u.created_at DESC`
        );

        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows,
        });

    } catch (error) {
        console.error("Get users error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
        });
    }
};

// LOGIN USER
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user
        const result = await pool.query(
            `SELECT
                id,
                hospital_id,
                name,
                email,
                phone,
                password_hash,
                role,
                department,
                status
             FROM users
             WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        // Check account status
        if (user.status !== "ACTIVE") {
            return res.status(403).json({
                success: false,
                message: `User account is ${user.status.toLowerCase()}`
            });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                userId: user.id,
                hospitalId: user.hospital_id,
                role: user.role,
                department: user.department
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        // Update last login
        await pool.query(
            `UPDATE users
             SET last_login_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [user.id]
        );

        // Remove password before sending response
        delete user.password_hash;

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed",
            error: error.message
        });
    }
};


// GET USER BY ID
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                u.id,
                u.hospital_id,
                h.name AS hospital_name,
                u.name,
                u.email,
                u.phone,
                u.role,
                u.department,
                u.status,
                u.email_verified,
                u.phone_verified,
                u.last_login_at,
                u.created_at,
                u.updated_at
             FROM users u
             INNER JOIN hospitals h
                ON u.hospital_id = h.id
             WHERE u.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0],
        });

    } catch (error) {
        console.error("Get user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch user",
        });
    }
};


// UPDATE USER
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            hospital_id,
            name,
            email,
            phone,
            password,
            role,
            department,
            status,
            email_verified,
            phone_verified,
        } = req.body;

        let passwordHash = null;

        if (password) {
            passwordHash = await bcrypt.hash(password, 12);
        }

        const result = await pool.query(
            `UPDATE users
             SET
                hospital_id = COALESCE($1, hospital_id),
                name = COALESCE($2, name),
                email = COALESCE($3, email),
                phone = COALESCE($4, phone),
                password_hash = COALESCE($5, password_hash),
                role = COALESCE($6, role),
                department = COALESCE($7, department),
                status = COALESCE($8, status),
                email_verified = COALESCE($9, email_verified),
                phone_verified = COALESCE($10, phone_verified),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $11
             RETURNING
                id,
                hospital_id,
                name,
                email,
                phone,
                role,
                department,
                status,
                email_verified,
                phone_verified,
                last_login_at,
                created_at,
                updated_at`,
            [
                hospital_id,
                name,
                email,
                phone,
                passwordHash,
                role,
                department,
                status,
                email_verified,
                phone_verified,
                id,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: result.rows[0],
        });

    } catch (error) {
        console.error("Update user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update user",
        });
    }
};


// DELETE USER
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM users
             WHERE id = $1
             RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });

    } catch (error) {
        console.error("Delete user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete user",
        });
    }
};