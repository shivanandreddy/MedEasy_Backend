import jwt from "jsonwebtoken";
import pool from "../config/db.js";

/**
 * --------------------------------------------------------------------------
 * Protect Middleware
 * --------------------------------------------------------------------------
 * Verifies JWT token and loads the user from database.
 *
 * Header:
 * Authorization: Bearer <token>
 * --------------------------------------------------------------------------
 */

export const protect = async (req, res, next) => {
    try {
        // 1. Get Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // 2. Extract token
        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is missing"
            });
        }

        // 3. Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // 4. Find user
        // IMPORTANT:
        // Login controller stores user.id as "userId"
        const result = await pool.query(
            `SELECT
                id,
                hospital_id,
                name,
                email,
                phone,
                role,
                department,
                status
             FROM users
             WHERE id = $1`,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        const user = result.rows[0];

        // 5. Check user status
        if (user.status !== "ACTIVE") {
            return res.status(403).json({
                success: false,
                message: "User account is not active"
            });
        }

        // 6. Attach user to request
        req.user = user;

        // 7. Continue
        next();

    } catch (error) {
        console.error("Authentication error:", error);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token has expired"
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Authentication failed"
        });
    }
};


/**
 * --------------------------------------------------------------------------
 * Authorize Middleware
 * --------------------------------------------------------------------------
 * Checks whether the logged-in user's role is allowed.
 *
 * Example:
 *
 * router.get(
 *     "/users",
 *     protect,
 *     authorize("admin", "useradmin"),
 *     getUsers
 * );
 * --------------------------------------------------------------------------
 */

export const authorize = (...allowedRoles) => {

    return (req, res, next) => {
        try {

            // protect middleware must run first
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }

            // Check role
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have permission to access this resource"
                });
            }

            next();

        } catch (error) {

            console.error("Authorization error:", error);

            return res.status(500).json({
                success: false,
                message: "Authorization failed"
            });
        }
    };
};