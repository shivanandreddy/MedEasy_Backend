-- database/enums.sql
-- Create custom ENUM types for MedEasy

-- Define user roles
CREATE TYPE user_role AS ENUM ('admin', 'useradmin', 'doctor','nurse', 'receptionist', 'billing_executive', 'accountant', 'finance', 'pharmacist', 'lab_technician','inventory_admin','blood_bank','insurance','medical_records_staff', 'patient');

-- Define department types
-- Drop TYPE IF EXISTS department_type;
CREATE TYPE department_type AS ENUM ('Administration', 'General ', 'Pharmacy', 'Laboratory', 'Hospital', 'Health Center', 'Medical Records', 'General Medicine');

--Add new department types

-- Add values to the existing ENUM type
-- ALTER TYPE department_type ADD VALUE 'General Medicine';