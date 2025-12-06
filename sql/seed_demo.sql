USE eventsphere;

-- ============================================================
-- CLEAR EXISTING DATA (optional if you re-run often)
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE certificates;
TRUNCATE TABLE certificate_templates;
TRUNCATE TABLE attendance;
TRUNCATE TABLE volunteer_team_members;
TRUNCATE TABLE volunteer_teams;
TRUNCATE TABLE volunteers;
TRUNCATE TABLE registrations;
TRUNCATE TABLE events;
TRUNCATE TABLE society_memberships;
TRUNCATE TABLE society_roles;
TRUNCATE TABLE societies;
TRUNCATE TABLE users;
TRUNCATE TABLE action_logs;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. USERS
--    - 1 super admin
--    - 3 student users
-- NOTE: password_hash are just dummy strings for now.
--       Later we'll overwrite with real bcrypt hashes in Day 3.
-- ============================================================

INSERT INTO users (name, email, password_hash, role, is_active)
VALUES
  ('Super Admin', 'admin@university.edu', '$2b$10$aXq28AN6r6KkQV0y8vmApe.pdKfhFiwalqX1MBbEtWavOHjnrKAXy', 'super_admin', 1),
  ('Ali Student', 'ali@university.edu', '$2b$10$aXq28AN6r6KkQV0y8vmApe.pdKfhFiwalqX1MBbEtWavOHjnrKAXy', 'student', 1),
  ('Sara Student', 'sara@university.edu', '$2b$10$aXq28AN6r6KkQV0y8vmApe.pdKfhFiwalqX1MBbEtWavOHjnrKAXy', 'student', 1),
  ('Hamza Student', 'hamza@university.edu', '$2b$10$aXq28AN6r6KkQV0y8vmApe.pdKfhFiwalqX1MBbEtWavOHjnrKAXy', 'student', 1);

-- After this:
-- user_id=1 → Super Admin
-- user_id=2 → Ali
-- user_id=3 → Sara
-- user_id=4 → Hamza

-- ============================================================
-- 2. SOCIETIES
-- ============================================================

INSERT INTO societies (name, description, created_by)
VALUES
  ('Programming Club', 'Handles coding events, hackathons and workshops.', 1),
  ('Media Club', 'Handles photography, videography, social media.', 1);

-- society_id=1 → Programming Club
-- society_id=2 → Media Club

-- ============================================================
-- 3. SOCIETY ROLES
--    - Define roles per society
--    - For now, core roles are created by super admin (user_id=1)
-- ============================================================

-- Programming Club roles
INSERT INTO society_roles (society_id, name, role_type, is_core, created_by)
VALUES
  (1, 'President',         'core',      1, 1),
  (1, 'Vice President',    'core',      1, 1),
  (1, 'General Secretary', 'core',      1, 1),
  (1, 'Member',            'member',    0, 1);

-- Media Club roles
INSERT INTO society_roles (society_id, name, role_type, is_core, created_by)
VALUES
  (2, 'President',         'core',      1, 1),
  (2, 'Media Secretary',   'committee', 0, 1),
  (2, 'Member',            'member',    0, 1);

-- Assuming auto-increment, you'll roughly have:
-- Programming Club:
--   role_id=1 → President (society 1)
--   role_id=2 → Vice President
--   role_id=3 → General Secretary
--   role_id=4 → Member
-- Media Club:
--   role_id=5 → President (society 2)
--   role_id=6 → Media Secretary
--   role_id=7 → Member

-- ============================================================
-- 4. SOCIETY MEMBERSHIPS
--    - Assign students to societies with roles
-- ============================================================

-- Ali = President of Programming Club
INSERT INTO society_memberships (society_id, user_id, role_id, is_active)
VALUES (1, 2, 1, 1);

-- Sara = Member of Programming Club
INSERT INTO society_memberships (society_id, user_id, role_id, is_active)
VALUES (1, 3, 4, 1);

-- Hamza = President of Media Club
INSERT INTO society_memberships (society_id, user_id, role_id, is_active)
VALUES (2, 4, 5, 1);

-- Sara = Media Secretary in Media Club (example of committee role)
INSERT INTO society_memberships (society_id, user_id, role_id, is_active)
VALUES (2, 3, 6, 1);

-- ============================================================
-- 5. EVENTS
--    - One event for each society
-- ============================================================

-- Programming Club: Free event
INSERT INTO events (
    society_id, created_by, title, description,
    event_date, start_time, end_time, venue,
    category, capacity, registration_deadline,
    banner_image_path, is_paid, base_fee_amount, is_active
) VALUES (
    1, 2, -- society_id=1, created_by=Ali (President of Programming)
    'Intro to Git & GitHub',
    'A beginner friendly workshop on Git fundamentals and GitHub workflows.',
    '2025-01-15', '15:00:00', '17:00:00', 'Lab 1, CS Department',
    'Workshop', 50, '2025-01-14 23:59:59',
    NULL,
    0, NULL, 1
);

-- Media Club: Paid event
INSERT INTO events (
    society_id, created_by, title, description,
    event_date, start_time, end_time, venue,
    category, capacity, registration_deadline,
    banner_image_path, is_paid, base_fee_amount, is_active
) VALUES (
    2, 4, -- society_id=2, created_by=Hamza (President of Media Club)
    'Photography Masterclass',
    'Hands-on photography session with professional trainers.',
    '2025-02-10', '10:00:00', '13:00:00', 'Auditorium',
    'Workshop', 30, '2025-02-08 23:59:59',
    NULL,
    1, 500.00, 1
);

-- Assume:
-- event_id=1 → Intro to Git (free)
-- event_id=2 → Photography Masterclass (paid)

-- ============================================================
-- 6. REGISTRATIONS
-- ============================================================

-- Sara registers for free Git event
INSERT INTO registrations (
    event_id, user_id, status,
    payment_required, fee_amount, payment_status,
    payment_screenshot_path
) VALUES (
    1, 3, 'registered',
    0, NULL, 'not_required',
    NULL
);

-- Ali registers for paid Photography event (payment yet to upload)
INSERT INTO registrations (
    event_id, user_id, status,
    payment_required, fee_amount, payment_status,
    payment_screenshot_path
) VALUES (
    2, 2, 'registered',
    1, 500.00, 'pending',
    NULL
);

-- Hamza registers for paid Photography event and uploads screenshot
INSERT INTO registrations (
    event_id, user_id, status,
    payment_required, fee_amount, payment_status,
    payment_screenshot_path
) VALUES (
    2, 4, 'registered',
    1, 500.00, 'submitted',
    '/uploads/payments/demo_hamza_payment.png'
);

-- ============================================================
-- 7. VOLUNTEERS
-- ============================================================

-- Sara volunteers for Git event
INSERT INTO volunteers (event_id, user_id, status)
VALUES (1, 3, 'approved');

-- Hamza volunteers for Git event (for demo)
INSERT INTO volunteers (event_id, user_id, status)
VALUES (1, 4, 'approved');

-- ============================================================
-- 8. VOLUNTEER TEAMS + MEMBERS
-- ============================================================

-- Create Logistics team for Git event, created by Ali (President)
INSERT INTO volunteer_teams (event_id, name, description, created_by)
VALUES (1, 'Logistics Team', 'Handles seating, registration desk, and on-ground support.', 2);

-- Create Media team for Git event
INSERT INTO volunteer_teams (event_id, name, description, created_by)
VALUES (1, 'Media Team', 'Handles photos and social media coverage.', 2);

-- Suppose:
-- team_id=1 → Logistics
-- team_id=2 → Media

-- Team members:
-- Sara = Team Head of Logistics
INSERT INTO volunteer_team_members (team_id, user_id, role, assigned_by)
VALUES (1, 3, 'Team Head', 2);

-- Hamza = Member of Logistics
INSERT INTO volunteer_team_members (team_id, user_id, role, assigned_by)
VALUES (1, 4, 'Member', 2);

-- ============================================================
-- 9. ATTENDANCE (Sample)
-- ============================================================

-- Mark Sara present for Git event
INSERT INTO attendance (event_id, user_id, attendance_status, marked_by)
VALUES (1, 3, 'present', 2);

-- Mark Hamza absent for Git event
INSERT INTO attendance (event_id, user_id, attendance_status, marked_by)
VALUES (1, 4, 'absent', 2);

-- ============================================================
-- 10. CERTIFICATE TEMPLATE + SAMPLE CERTIFICATE
-- ============================================================

-- Default template for Programming Club
INSERT INTO certificate_templates (society_id, name, template_file_path, created_by)
VALUES (
    1,
    'Default Participation Template',
    '/templates/programming_club_default.html',
    2
);

-- Assume template_id=1
-- Create a sample certificate for Sara's Git event registration (registration_id=1)
INSERT INTO certificates (
    registration_id, template_id, verification_token,
    status, file_path, issued_by, issued_at
) VALUES (
    1, 1, 'DEMO_VERIFICATION_TOKEN_123',
    'ready', '/generated_certs/sample_sara_git_event.pdf', 2, NOW()
);

-- ============================================================
-- 11. ACTION LOGS (Sample)
-- ============================================================

INSERT INTO action_logs (user_id, action_type, target_type, target_id, details)
VALUES
  (2, 'CREATE_EVENT', 'event', 1, 'Created "Intro to Git & GitHub"'),
  (4, 'CREATE_EVENT', 'event', 2, 'Created "Photography Masterclass"'),
  (2, 'GENERATE_CERTIFICATES', 'event', 1, 'Generated certificates for Git workshop');
