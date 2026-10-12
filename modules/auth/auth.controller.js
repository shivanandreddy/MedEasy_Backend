
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import  pool  from "../../config/db.js";

const USER_ROLES = [
  "admin",
  "useradmin",
  "doctor",
  "nurse",
  "receptionist",
  "billing_executive",
  "accountant",
  "finance",
  "pharmacist",
  "lab_technician",
  "inventory_admin",
  "blood_bank",
  "insurance",
  "medical_records_staff",
  "patient",
];

const USER_STATUSES = ["ACTIVE", "INACTIVE", "LOCKED"];

// --------------------------------------------------
// CREATE USER
// POST /api/auth/users
// --------------------------------------------------
export const createUser = async (req, res) => {
  try {
    const {
      hospital_id,
      name,
      email,
      phone,
      password,
      role = "useradmin",
      department_id = null,
      status = "ACTIVE",
    } = req.body;

    // Required fields
    if (!hospital_id || !name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Hospital, name, email, and password are required.",
      });
    }

    if (typeof email !== "string" || typeof name !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid name or email format.",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role.",
      });
    }

    if (!USER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user status.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    // Verify hospital
    const hospitalResult = await pool.query(
      `SELECT id
       FROM hospitals
       WHERE id = $1`,
      [hospital_id]
    );

    if (hospitalResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Hospital not found.",
      });
    }

    // Department is optional. If supplied, it must belong
    // to the same hospital and be active.
    if (department_id !== null && department_id !== "") {
      const departmentResult = await pool.query(
        `SELECT id
         FROM departments
         WHERE id = $1
           AND hospital_id = $2
           AND status = 'ACTIVE'`,
        [department_id, hospital_id]
      );

      if (departmentResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Department not found, inactive, or not assigned to this hospital.",
        });
      }
    }

    const finalDepartmentId =
      department_id === "" ? null : department_id;

    // Check duplicate email
    const existingUser = await pool.query(
      `SELECT id
       FROM users
       WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (
        hospital_id,
        name,
        email,
        phone,
        password_hash,
        role,
        department_id,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        hospital_id,
        name,
        email,
        phone,
        role,
        department_id,
        status,
        created_at,
        updated_at`,
      [
        hospital_id,
        normalizedName,
        normalizedEmail,
        phone || null,
        passwordHash,
        role,
        finalDepartmentId,
        status,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Create user error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    if (error.code === "23503" || error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message: "Invalid hospital, department, or identifier.",
      });
    }

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message: "Invalid role, status, or identifier.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create user.",
    });
  }
};

// --------------------------------------------------
// LOGIN
// POST /api/auth/login
// --------------------------------------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");

      return res.status(500).json({
        success: false,
        message: "Authentication is not configured.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Fetch user and optional department details
    const result = await pool.query(
      `SELECT
        u.id,
        u.hospital_id,
        u.name,
        u.email,
        u.phone,
        u.password_hash,
        u.role,
        u.department_id,
        u.status,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        d.name AS department_name,
        d.code AS department_code,
        h.name AS hospital_name
      FROM users u
      LEFT JOIN departments d
        ON d.id = u.department_id
       AND d.hospital_id = u.hospital_id
      LEFT JOIN hospitals h
        ON h.id = u.hospital_id
      WHERE LOWER(u.email) = $1
      LIMIT 1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];

    // Prevent login for inactive or locked accounts
    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive or locked. Contact your administrator.",
      });
    }

    // Verify password
    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Match decoded.id expected by existing authentication middleware
    const token = jwt.sign(
      {
        id: user.id,
        hospital_id: user.hospital_id,
        role: user.role,
        department_id: user.department_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Update last login
    await pool.query(
      `UPDATE users
       SET last_login_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [user.id]
    );

    // Never send password_hash to the client
    const {
      password_hash,
      ...safeUser
    } = user;

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in. Please try again.",
    });
  }
};
