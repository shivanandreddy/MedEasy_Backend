-- database/enums.sql
-- Create custom ENUM types for MedEasy

-- Define user roles
CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'staff', 'patient');

-- Define hospital workgroups/departments
CREATE TYPE department_type AS ENUM ('Cardiology', 'Pediatrics', 'Emergency', 'Administration', 'General');



-- DROP TYPE IF EXISTS workgroup_type;