
-- 1. Add department assignment to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS department_id UUID;

-- 2. Ensure user and department belong to the same hospital
ALTER TABLE users
ADD CONSTRAINT fk_users_hospital_department
FOREIGN KEY (hospital_id, department_id)
REFERENCES departments (hospital_id, id)
ON DELETE RESTRICT;
