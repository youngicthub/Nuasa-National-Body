-- =====================================================================
-- NUASA Convention Registration Seed — 10 students (Jul 2026)
-- Password for all accounts: 123456
-- Run: mysql -u root -p nuasa_database < scripts/seed-convention-students.sql
-- =====================================================================
USE nuasa_database;

SET @pw = '$2b$12$kt2aC0qWOP2YhLrIkd87QOZP5kPGjPQFUkyJeJhNB.W4dUHmoUgR2';

-- Users
INSERT IGNORE INTO users (id, email, password_hash, email_verified, created_at, updated_at) VALUES
  ('a1000001-0000-4000-a000-000000000001','onwegoodnessidagbo@gmail.com',@pw,1,'2026-07-09 00:00:00','2026-07-09 00:00:00'),
  ('a1000001-0000-4000-a000-000000000002','zubairfatiha502@gmail.com',@pw,1,'2026-07-11 00:00:00','2026-07-11 00:00:00'),
  ('a1000001-0000-4000-a000-000000000003','ekwunifevictor250@gmail.com',@pw,1,'2026-07-14 00:00:00','2026-07-14 00:00:00'),
  ('a1000001-0000-4000-a000-000000000004','fathiaoluwajuwonloatotileto@gmail.com',@pw,1,'2026-07-14 00:00:00','2026-07-14 00:00:00'),
  ('a1000001-0000-4000-a000-000000000005','akpastella229@gmail.com',@pw,1,'2026-07-16 00:00:00','2026-07-16 00:00:00'),
  ('a1000001-0000-4000-a000-000000000006','lateefnasirat2002@gmail.com',@pw,1,'2026-07-18 00:00:00','2026-07-18 00:00:00'),
  ('a1000001-0000-4000-a000-000000000007','firdaosadeniran2@gmail.com',@pw,1,'2026-07-08 00:00:00','2026-07-08 00:00:00'),
  ('a1000001-0000-4000-a000-000000000008','ekundayoglory8@gmail.com',@pw,1,'2026-07-23 00:00:00','2026-07-23 00:00:00'),
  ('a1000001-0000-4000-a000-000000000009','raymondfavour72@gmail.com',@pw,1,'2026-07-22 00:00:00','2026-07-22 00:00:00'),
  ('a1000001-0000-4000-a000-000000000010','nwokeukwujuliet@gmail.com',@pw,1,'2026-07-22 00:00:00','2026-07-22 00:00:00');

-- Profiles
INSERT IGNORE INTO profiles (id, user_id, full_name, email, created_at, updated_at) VALUES
  ('b1000001-0000-4000-b000-000000000001','a1000001-0000-4000-a000-000000000001','Onwe Goodness Idagbo','onwegoodnessidagbo@gmail.com','2026-07-09 00:00:00','2026-07-09 00:00:00'),
  ('b1000001-0000-4000-b000-000000000002','a1000001-0000-4000-a000-000000000002','Zubair Fatiha Ayomide','zubairfatiha502@gmail.com','2026-07-11 00:00:00','2026-07-11 00:00:00'),
  ('b1000001-0000-4000-b000-000000000003','a1000001-0000-4000-a000-000000000003','Victor Akachi Ekwunife','ekwunifevictor250@gmail.com','2026-07-14 00:00:00','2026-07-14 00:00:00'),
  ('b1000001-0000-4000-b000-000000000004','a1000001-0000-4000-a000-000000000004','Atotileto Fathia Oluwajuwonlo','fathiaoluwajuwonloatotileto@gmail.com','2026-07-14 00:00:00','2026-07-14 00:00:00'),
  ('b1000001-0000-4000-b000-000000000005','a1000001-0000-4000-a000-000000000005','Akpa Stella Chiamaka','akpastella229@gmail.com','2026-07-16 00:00:00','2026-07-16 00:00:00'),
  ('b1000001-0000-4000-b000-000000000006','a1000001-0000-4000-a000-000000000006','Lateef Nasirat Opeyemi','lateefnasirat2002@gmail.com','2026-07-18 00:00:00','2026-07-18 00:00:00'),
  ('b1000001-0000-4000-b000-000000000007','a1000001-0000-4000-a000-000000000007','Firdaos Adeniran Adetoro','firdaosadeniran2@gmail.com','2026-07-08 00:00:00','2026-07-08 00:00:00'),
  ('b1000001-0000-4000-b000-000000000008','a1000001-0000-4000-a000-000000000008','Ekundayo Glory Eseohe','ekundayoglory8@gmail.com','2026-07-23 00:00:00','2026-07-23 00:00:00'),
  ('b1000001-0000-4000-b000-000000000009','a1000001-0000-4000-a000-000000000009','Raymond Favour Chinecherem','raymondfavour72@gmail.com','2026-07-22 00:00:00','2026-07-22 00:00:00'),
  ('b1000001-0000-4000-b000-000000000010','a1000001-0000-4000-a000-000000000010','Nwokeukwu Chisom Juliet','nwokeukwujuliet@gmail.com','2026-07-22 00:00:00','2026-07-22 00:00:00');

-- Roles
INSERT IGNORE INTO user_roles (id, user_id, role, created_at) VALUES
  ('c1000001-0000-4000-c000-000000000001','a1000001-0000-4000-a000-000000000001','user','2026-07-09 00:00:00'),
  ('c1000001-0000-4000-c000-000000000002','a1000001-0000-4000-a000-000000000002','user','2026-07-11 00:00:00'),
  ('c1000001-0000-4000-c000-000000000003','a1000001-0000-4000-a000-000000000003','user','2026-07-14 00:00:00'),
  ('c1000001-0000-4000-c000-000000000004','a1000001-0000-4000-a000-000000000004','user','2026-07-14 00:00:00'),
  ('c1000001-0000-4000-c000-000000000005','a1000001-0000-4000-a000-000000000005','user','2026-07-16 00:00:00'),
  ('c1000001-0000-4000-c000-000000000006','a1000001-0000-4000-a000-000000000006','user','2026-07-18 00:00:00'),
  ('c1000001-0000-4000-c000-000000000007','a1000001-0000-4000-a000-000000000007','user','2026-07-08 00:00:00'),
  ('c1000001-0000-4000-c000-000000000008','a1000001-0000-4000-a000-000000000008','user','2026-07-23 00:00:00'),
  ('c1000001-0000-4000-c000-000000000009','a1000001-0000-4000-a000-000000000009','user','2026-07-22 00:00:00'),
  ('c1000001-0000-4000-c000-000000000010','a1000001-0000-4000-a000-000000000010','user','2026-07-22 00:00:00');

-- Convention registrations (with breakout_session column)
INSERT IGNORE INTO convention_registrations
  (id, user_id, registration_type, full_name, email, phone, amount, currency, payment_status, tx_ref, reference_code, breakout_session, created_at, updated_at)
VALUES
  ('d1000001-0000-4000-d000-000000000001','a1000001-0000-4000-a000-000000000001','student','Onwe Goodness Idagbo','onwegoodnessidagbo@gmail.com','08146622290',300.00,'NGN','successful','NUASA-1783623956149-4dfd1n','NUASA-REG-2026-001','Academic Research & Library Science','2026-07-09 00:00:00','2026-07-09 00:00:00'),
  ('d1000001-0000-4000-d000-000000000002','a1000001-0000-4000-a000-000000000002','student','Zubair Fatiha Ayomide','zubairfatiha502@gmail.com','09039431251',300.00,'NGN','successful','NUASA-1783726414781-eh1jdp','NUASA-REG-2026-002','Career Development & Professional Networking','2026-07-11 00:00:00','2026-07-11 00:00:00'),
  ('d1000001-0000-4000-d000-000000000003','a1000001-0000-4000-a000-000000000003','student','Victor Akachi Ekwunife','ekwunifevictor250@gmail.com','09161546386',300.00,'NGN','successful','NUASA-1784047195736-d70d82','NUASA-REG-2026-003','Mental Health & Student Wellbeing','2026-07-14 00:00:00','2026-07-14 00:00:00'),
  ('d1000001-0000-4000-d000-000000000004','a1000001-0000-4000-a000-000000000004','student','Atotileto Fathia Oluwajuwonlo','fathiaoluwajuwonloatotileto@gmail.com','08116313514',300.00,'NGN','successful','NUASA-1784204123062-ttza85','NUASA-REG-2026-004','Leadership & Governance in NUASA','2026-07-14 00:00:00','2026-07-14 00:00:00'),
  ('d1000001-0000-4000-d000-000000000005','a1000001-0000-4000-a000-000000000005','student','Akpa Stella Chiamaka','akpastella229@gmail.com','08169972974',300.00,'NGN','successful','NUASA-1784223874178-h13j3x','NUASA-REG-2026-005','Innovation & Technology in Library Science','2026-07-16 00:00:00','2026-07-16 00:00:00'),
  ('d1000001-0000-4000-d000-000000000006','a1000001-0000-4000-a000-000000000006','student','Lateef Nasirat Opeyemi','lateefnasirat2002@gmail.com','08138057535',300.00,'NGN','successful','NUASA-1784643838988-r831j6','NUASA-REG-2026-006','Academic Research & Library Science','2026-07-18 00:00:00','2026-07-18 00:00:00'),
  ('d1000001-0000-4000-d000-000000000007','a1000001-0000-4000-a000-000000000007','student','Firdaos Adeniran Adetoro','firdaosadeniran2@gmail.com','09136544715',300.00,'NGN','successful','NUASA-1784657679059-xstqva','NUASA-REG-2026-007','Career Development & Professional Networking','2026-07-08 00:00:00','2026-07-08 00:00:00'),
  ('d1000001-0000-4000-d000-000000000008','a1000001-0000-4000-a000-000000000008','student','Ekundayo Glory Eseohe','ekundayoglory8@gmail.com','09064847109',300.00,'NGN','successful','NUASA-1784839158028-55s2ks','NUASA-REG-2026-008','Mental Health & Student Wellbeing','2026-07-23 00:00:00','2026-07-23 00:00:00'),
  ('d1000001-0000-4000-d000-000000000009','a1000001-0000-4000-a000-000000000009','student','Raymond Favour Chinecherem','raymondfavour72@gmail.com','09163858196',300.00,'NGN','successful','NUASA-1784719914511-tce5wu','NUASA-REG-2026-009','Leadership & Governance in NUASA','2026-07-22 00:00:00','2026-07-22 00:00:00'),
  ('d1000001-0000-4000-d000-000000000010','a1000001-0000-4000-a000-000000000010','student','Nwokeukwu Chisom Juliet','nwokeukwujuliet@gmail.com','09032849308',300.00,'NGN','successful','NUASA-1784708531304-km1oha','NUASA-REG-2026-010','Innovation & Technology in Library Science','2026-07-22 00:00:00','2026-07-22 00:00:00');
