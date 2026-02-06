-- Database Schema for 360GatePass System

-- Drop existing tables if exist
DROP TABLE IF EXISTS check_logs CASCADE;
DROP TABLE IF EXISTS passes CASCADE;
DROP TABLE IF EXISTS status_history CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('guest', 'host', 'security', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Visits/Requests table
CREATE TABLE visits (
    id SERIAL PRIMARY KEY,
    guest_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    host_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    purpose TEXT NOT NULL,
    visit_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_host' 
        CHECK (status IN ('pending_host', 'rejected_by_host', 'pending_security', 'approved', 'completed', 'cancelled')),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Passes table
CREATE TABLE passes (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
    pass_code VARCHAR(50) UNIQUE NOT NULL,
    issued_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check-in/Check-out logs
CREATE TABLE check_logs (
    id SERIAL PRIMARY KEY,
    pass_id INTEGER REFERENCES passes(id) ON DELETE CASCADE,
    visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
    log_type VARCHAR(20) NOT NULL CHECK (log_type IN ('check_in', 'check_out')),
    logged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Status history (Bonus feature)
CREATE TABLE status_history (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_visits_guest ON visits(guest_id);
CREATE INDEX idx_visits_host ON visits(host_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_passes_code ON passes(pass_code);
CREATE INDEX idx_check_logs_visit ON check_logs(visit_id);
CREATE INDEX idx_status_history_visit ON status_history(visit_id);

-- Insert default users (password for all: admin123)
INSERT INTO users (name, email, phone, password_hash, role) VALUES 
('مدیر سیستم', 'admin@360gatepass.com', '09123456789', '$2b$10$adIfha6BjSV5v1oQsC5pjugGFjlbqgVxq3WH5HT3vOfqLzVx3T5Pu', 'admin'),
('نگهبان', 'security@360gatepass.com', '09123456788', '$2b$10$adIfha6BjSV5v1oQsC5pjugGFjlbqgVxq3WH5HT3vOfqLzVx3T5Pu', 'security'),
('میزبان تست', 'host@360gatepass.com', '09123456787', '$2b$10$adIfha6BjSV5v1oQsC5pjugGFjlbqgVxq3WH5HT3vOfqLzVx3T5Pu', 'host'),
('میزبان تست دو', 'secondHost@360gatepass.com', '09123456787', '$2b$10$adIfha6BjSV5v1oQsC5pjugGFjlbqgVxq3WH5HT3vOfqLzVx3T5Pu', 'host');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();