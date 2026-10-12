-- database/schema.sql
-- Create the main users table for MedEasy
-- CREATE TABLE organizations (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

--     name VARCHAR(150) NOT NULL,
--     code VARCHAR(50) NOT NULL UNIQUE,

--     status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
--         CHECK (status IN ('ACTIVE', 'INACTIVE')),

--     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE hospitals (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

--     organization_id UUID NOT NULL,

--     name VARCHAR(200) NOT NULL,
--     code VARCHAR(50) NOT NULL UNIQUE,

--     address TEXT,
--     phone VARCHAR(15),
--     email VARCHAR(255),

--     status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
--         CHECK (status IN ('ACTIVE', 'INACTIVE')),

--     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--     CONSTRAINT fk_hospital_organization
--         FOREIGN KEY (organization_id)
--         REFERENCES organizations(id)
--         ON DELETE RESTRICT
-- );

-- CREATE TABLE users (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

--     hospital_id UUID NOT NULL,

--     name VARCHAR(150) NOT NULL,
--     email VARCHAR(255) NOT NULL UNIQUE,
--     phone VARCHAR(15),

--     password_hash TEXT NOT NULL,

--     role user_role NOT NULL DEFAULT 'useradmin',

--     department department_type,

--     status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
--         CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED')),

--     last_login_at TIMESTAMP,

--     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--     CONSTRAINT fk_user_hospital
--         FOREIGN KEY (hospital_id)
--         REFERENCES hospitals(id)
--         ON DELETE RESTRICT
-- );



CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE,

    doctor_code VARCHAR(50) UNIQUE NOT NULL,

    qualification VARCHAR(255),
    specialization VARCHAR(255),

    medical_registration_number VARCHAR(100),

    experience_years NUMERIC(5,2),

    consultation_fee NUMERIC(10,2) DEFAULT 0,

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_doctor_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- EZO MED: Departments master table

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    hospital_id UUID NOT NULL,

    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,

    status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_departments_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospitals(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_departments_hospital_code
        UNIQUE (hospital_id, code),

    CONSTRAINT uq_departments_hospital_name
        UNIQUE (hospital_id, name),

    CONSTRAINT uq_departments_hospital_id
        UNIQUE (hospital_id, id)
);

-- Improve department lookups by hospital
CREATE INDEX IF NOT EXISTS idx_departments_hospital
    ON departments(hospital_id);

CREATE INDEX IF NOT EXISTS idx_departments_status
    ON departments(hospital_id, status);
