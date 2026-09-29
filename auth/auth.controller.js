
import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// 1. REGISTER CONTROLLER
export const register = async (req, res) => {
    try {
        const { employee_id, full_name, email, password, role, department } = req.body;

        // Check if user already exists by email or employee ID
        const userCheck = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR employee_id = $2',
            [email, employee_id]
        );

        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'User with this email or employee ID already exists.' });
        }

        // Hash the password securely
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Insert new user into PostgreSQL
        const newUserQuery = `
            INSERT INTO users (employee_id, full_name, email, password_hash, role, department)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, employee_id, full_name, email, role, department, created_at;
        `;

        const values = [
            employee_id, 
            full_name, 
            email, 
            password_hash, 
            role || 'staff', 
            department || 'General'
        ];

        const newUserData = await pool.query(newUserQuery, values);

        return res.status(201).json({
            message: 'User registered successfully!',
            user: newUserData.rows[0]
        });

    } catch (err) {
        console.error('Registration Error:', err.message);
        return res.status(500).json({ error: 'Server error during registration.' });
    }
};

// 2. LOGIN CONTROLLER
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = userResult.rows[0];

        // Check if account is active
        if (!user.is_active) {
            return res.status(403).json({ error: 'This account has been deactivated.' });
        }

        // Compare submitted password with stored hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Generate a JWT Token (Expires in 1 day)
        const tokenPayload = {
            id: user.id,
            employee_id: user.employee_id,
            role: user.role,
            department: user.department
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'your_fallback_secret', {
            expiresIn: '1d'
        });

        return res.status(200).json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                employee_id: user.employee_id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                department: user.department,
            }
        });

    } catch (err) {
        console.error('Login Error:', err.message);
        return res.status(500).json({ error: 'Server error during login.' });
    }
};

// 3. ALL USERS INFO CONTROLLER
export const getAllUsers = async (req, res) => {
    try {
        const users = await pool.query('SELECT * FROM users');
        return res.status(200).json(users.rows);
    } catch (err) {
        console.error('Error:', err.message);
        return res.status(500).json({ error: 'Server error during user info retrieval.' });
    }
};
