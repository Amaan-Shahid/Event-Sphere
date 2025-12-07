-- ============================================================
-- EventSphere Database Schema
-- ============================================================

-- WARNING: This DROPS the database if it already exists
DROP DATABASE IF EXISTS eventsphere;
CREATE DATABASE eventsphere CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE eventsphere;

-- ============================================================
-- 1. USERS
--    - All system users: students + super admin
--    - Society leaders are determined by memberships (not here)
-- ============================================================

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'super_admin') NOT NULL DEFAULT 'student',
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. SOCIETIES
--    - Each student society/club
-- ============================================================

CREATE TABLE societies (
  society_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_societies_created_by FOREIGN KEY (created_by) REFERENCES users(user_id)
    ON DELETE SET NULL
);


-- ============================================================
-- 3. SOCIETY ROLES
--    - Defines title/position per society
--    - Allows flexible roles (President, Media Sec, Finance Sec, etc.)
--    - role_type and is_core support UI + permission logic
-- ============================================================

CREATE TABLE society_roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    name VARCHAR(150) NOT NULL, -- e.g., "President", "Media Secretary"
    role_type ENUM('core', 'committee', 'member') DEFAULT 'member',
    is_core TINYINT(1) DEFAULT 0, -- core = full admin privileges
    created_by INT NOT NULL,      -- super admin or society admin
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_society_roles_society
        FOREIGN KEY (society_id) REFERENCES societies(society_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_society_roles_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON DELETE RESTRICT,
    CONSTRAINT uc_society_role_name UNIQUE (society_id, name)
);

-- ============================================================
-- 4. SOCIETY MEMBERSHIPS
--    - Students belonging to societies
--    - role_id links to society_roles
-- ============================================================

CREATE TABLE society_memberships (
    membership_id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    user_id INT NOT NULL,
    role_id INT NOT NULL, -- defines president/core/committee/member
    is_active TINYINT(1) DEFAULT 1,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME NULL,

    CONSTRAINT fk_society_memberships_society
        FOREIGN KEY (society_id) REFERENCES societies(society_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_society_memberships_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_society_memberships_role
        FOREIGN KEY (role_id) REFERENCES society_roles(role_id)
        ON DELETE RESTRICT,

    CONSTRAINT uc_society_membership UNIQUE (society_id, user_id)
);

-- ============================================================
-- 5. EVENTS
--    - Events created by society leaders (president/core roles)
-- ============================================================

CREATE TABLE events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    created_by INT NOT NULL, -- student leader
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    venue VARCHAR(255),
    category VARCHAR(100),
    capacity INT DEFAULT 0,
    registration_deadline DATETIME NULL,
    banner_image_path VARCHAR(500) NULL,

    -- Paid Events
    is_paid TINYINT(1) DEFAULT 0,
    base_fee_amount DECIMAL(10,2) NULL,

    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_events_society
        FOREIGN KEY (society_id) REFERENCES societies(society_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_events_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 6. REGISTRATIONS
--    - Student registrations for events
--    - Includes manual payment screenshots
-- ============================================================

CREATE TABLE registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('registered', 'cancelled', 'waitlisted') DEFAULT 'registered',

    -- Payment details
    payment_required TINYINT(1) DEFAULT 0,
    fee_amount DECIMAL(10,2) NULL,
    payment_status ENUM('not_required', 'pending', 'submitted', 'approved', 'rejected')
        DEFAULT 'not_required',
    payment_screenshot_path VARCHAR(500) NULL,

    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_registrations_event
        FOREIGN KEY (event_id) REFERENCES events(event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_registrations_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT uc_registration UNIQUE (event_id, user_id)
);

-- ============================================================
-- 7. VOLUNTEERS
--    - Students applying to volunteer
-- ============================================================

CREATE TABLE volunteers (
    volunteer_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_volunteers_event
        FOREIGN KEY (event_id) REFERENCES events(event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_volunteers_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT uc_volunteer UNIQUE (event_id, user_id)
);

-- ============================================================
-- 8. VOLUNTEER TEAMS
--    - Teams like Logistics, Media, Registration Desk for each event
-- ============================================================

CREATE TABLE volunteer_teams (
    team_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,  -- student leader
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_volunteer_teams_event
        FOREIGN KEY (event_id) REFERENCES events(event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_volunteer_teams_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 9. VOLUNTEER TEAM MEMBERS
--    - Assign volunteers into teams + roles (Team Head, Member)
-- ============================================================

CREATE TABLE volunteer_team_members (
    team_member_id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(100) DEFAULT 'Member',
    assigned_by INT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_team_members_team
        FOREIGN KEY (team_id) REFERENCES volunteer_teams(team_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_team_members_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_team_members_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT uc_team_member UNIQUE (team_id, user_id)
);

-- ============================================================
-- 10. ATTENDANCE
--      - Event attendance (QR scanned)
-- ============================================================

CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    attendance_status ENUM('present', 'absent') DEFAULT 'present',
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    marked_by INT NULL,

    CONSTRAINT fk_attendance_event
        FOREIGN KEY (event_id) REFERENCES events(event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_attendance_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_attendance_marked_by
        FOREIGN KEY (marked_by) REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT uc_attendance UNIQUE (event_id, user_id)
);

-- ============================================================
-- 11. CERTIFICATE TEMPLATES
-- ============================================================

CREATE TABLE certificate_templates (
    template_id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    template_file_path VARCHAR(500) NOT NULL,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cert_templates_society
        FOREIGN KEY (society_id) REFERENCES societies(society_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_cert_templates_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 12. CERTIFICATES
-- ============================================================

CREATE TABLE certificates (
    certificate_id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NOT NULL,
    template_id INT NULL,
    verification_token VARCHAR(64) NOT NULL UNIQUE,
    status ENUM('pending', 'ready', 'failed', 'revoked') DEFAULT 'pending',
    file_path VARCHAR(500) NULL,
    issued_by INT NULL,
    issued_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_certificates_registration
        FOREIGN KEY (registration_id) REFERENCES registrations(registration_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_certificates_template
        FOREIGN KEY (template_id) REFERENCES certificate_templates(template_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_certificates_issued_by
        FOREIGN KEY (issued_by) REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- ============================================================
-- 13. ACTION LOGS
-- ============================================================

CREATE TABLE action_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NULL,
    target_id INT NULL,
    details TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_action_logs_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_user ON registrations(user_id);
CREATE INDEX idx_attendance_event ON attendance(event_id);
CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_volunteers_event ON volunteers(event_id);
CREATE INDEX idx_certificates_registration ON certificates(registration_id);
