-- PostgreSQL schema for NUASA National E-Library
-- Converted from MySQL dump

-- ─── admin_login_log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_login_log (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  email       VARCHAR(255),
  user_agent  TEXT,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_login_log_user    ON admin_login_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_login_log_created ON admin_login_log(created_at DESC);

-- ─── app_settings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key         VARCHAR(255) NOT NULL PRIMARY KEY,
  value       JSONB        NOT NULL,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_by  VARCHAR(36)
);

-- ─── users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              VARCHAR(36)  NOT NULL PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── auth_tokens ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  CHAR(64)     NOT NULL UNIQUE,
  token_type  VARCHAR(50)  NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash    ON auth_tokens(token_hash);

-- ─── user_roles ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id         VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- ─── profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id             VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id        VARCHAR(36)  NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name      VARCHAR(255) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  institution    VARCHAR(255),
  academic_level VARCHAR(100),
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- ─── categories ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  slug        VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  type        VARCHAR(20)  NOT NULL DEFAULT 'both',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

-- ─── tags ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL UNIQUE,
  slug       VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- ─── blog_posts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  title       VARCHAR(500) NOT NULL,
  slug        VARCHAR(500) NOT NULL UNIQUE,
  content     TEXT         NOT NULL,
  excerpt     TEXT,
  cover_image TEXT,
  author_id   VARCHAR(36),
  category_id VARCHAR(36)  REFERENCES categories(id) ON DELETE SET NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN      NOT NULL DEFAULT FALSE,
  read_time   INT          NOT NULL DEFAULT 5,
  views       INT          NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug      ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status    ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author    ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC);

-- ─── blog_post_tags ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_post_tags (
  id      VARCHAR(36) NOT NULL PRIMARY KEY,
  post_id VARCHAR(36) NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id  VARCHAR(36) NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE (post_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON blog_post_tags(tag_id);

-- ─── library_resources ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_resources (
  id             VARCHAR(36)  NOT NULL PRIMARY KEY,
  title          VARCHAR(500) NOT NULL,
  description    TEXT,
  file_url       TEXT         NOT NULL,
  file_name      VARCHAR(500) NOT NULL,
  file_size      INT,
  file_type      VARCHAR(100),
  cover_image    TEXT,
  course         VARCHAR(255),
  level          VARCHAR(100),
  category_id    VARCHAR(36)  REFERENCES categories(id) ON DELETE SET NULL,
  author_id      VARCHAR(36),
  is_public      BOOLEAN      NOT NULL DEFAULT FALSE,
  is_featured    BOOLEAN      NOT NULL DEFAULT FALSE,
  download_count INT          NOT NULL DEFAULT 0,
  view_count     INT          NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_library_resources_category ON library_resources(category_id);
CREATE INDEX IF NOT EXISTS idx_library_resources_author   ON library_resources(author_id);
CREATE INDEX IF NOT EXISTS idx_library_resources_public   ON library_resources(is_public);

-- ─── library_resource_tags ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_resource_tags (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  resource_id VARCHAR(36) NOT NULL REFERENCES library_resources(id) ON DELETE CASCADE,
  tag_id      VARCHAR(36) NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE (resource_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_library_resource_tags_tag ON library_resource_tags(tag_id);

-- ─── chapters ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapters (
  id               VARCHAR(36)  NOT NULL PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  university       VARCHAR(500) NOT NULL,
  slug             VARCHAR(255) NOT NULL UNIQUE,
  description      TEXT,
  group_picture_url TEXT,
  location         VARCHAR(255),
  established_year INT,
  contact_email    VARCHAR(255),
  member_count     INT          NOT NULL DEFAULT 0,
  social_links     JSONB,
  display_order    INT          NOT NULL DEFAULT 0,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chapters_slug   ON chapters(slug);
CREATE INDEX IF NOT EXISTS idx_chapters_active ON chapters(is_active, display_order);

-- ─── events ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id           VARCHAR(36)  NOT NULL PRIMARY KEY,
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  location     VARCHAR(500),
  cover_image  TEXT,
  link         TEXT,
  start_time   TIMESTAMPTZ  NOT NULL,
  end_time     TIMESTAMPTZ,
  is_published BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by   VARCHAR(36),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_events_published  ON events(is_published);

-- ─── executives ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS executives (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  full_name  VARCHAR(255) NOT NULL,
  position   VARCHAR(255) NOT NULL,
  bio        TEXT,
  image_url  TEXT,
  email      VARCHAR(255),
  phone      VARCHAR(50),
  sort_order INT          NOT NULL DEFAULT 0,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_executives_active ON executives(is_active, sort_order);

-- ─── convention_registrations ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS convention_registrations (
  id                      VARCHAR(36)    NOT NULL PRIMARY KEY,
  user_id                 VARCHAR(36)    NOT NULL,
  registration_type       VARCHAR(20)    NOT NULL,
  full_name               VARCHAR(255)   NOT NULL,
  email                   VARCHAR(255)   NOT NULL,
  phone                   VARCHAR(50)    NOT NULL,
  institution             VARCHAR(500),
  chapter_name            VARCHAR(255),
  delegates_count         INT            NOT NULL DEFAULT 1,
  delegates               JSONB,
  amount                  NUMERIC(12,2)  NOT NULL,
  currency                VARCHAR(10)    NOT NULL DEFAULT 'NGN',
  payment_status          VARCHAR(20)    NOT NULL DEFAULT 'pending',
  tx_ref                  VARCHAR(255)   NOT NULL UNIQUE,
  flw_transaction_id      VARCHAR(255),
  reference_code          VARCHAR(255)   NOT NULL UNIQUE,
  notes                   TEXT,
  gender                  VARCHAR(20),
  department              VARCHAR(255),
  matric_number           VARCHAR(100),
  graduation_year         INT,
  accommodation_request   TEXT,
  emergency_contact_name  VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  breakout_session        VARCHAR(255),
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conv_reg_user   ON convention_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_reg_status ON convention_registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_conv_reg_email  ON convention_registrations(email);

-- ─── post_views ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_views (
  id        VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id   VARCHAR(36) NOT NULL,
  post_id   VARCHAR(36) NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_post_views_user ON post_views(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_post ON post_views(post_id);

-- ─── resource_views ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resource_views (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36),
  resource_id VARCHAR(36) NOT NULL REFERENCES library_resources(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resource_views_resource ON resource_views(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_views_user     ON resource_views(user_id);

-- ─── resource_downloads ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resource_downloads (
  id            VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id       VARCHAR(36) NOT NULL,
  resource_id   VARCHAR(36) NOT NULL REFERENCES library_resources(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resource_downloads_user     ON resource_downloads(user_id, downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_downloads_resource ON resource_downloads(resource_id);

-- ─── saved_posts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_posts (
  id         VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  post_id    VARCHAR(36) NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON saved_posts(user_id);

-- ─── saved_resources ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_resources (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36) NOT NULL,
  resource_id VARCHAR(36) NOT NULL REFERENCES library_resources(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_resources_user ON saved_resources(user_id);

-- ─── site_visits ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_visits (
  id         VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36),
  session_id VARCHAR(255)  NOT NULL,
  path       VARCHAR(2000) NOT NULL,
  referrer   TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON site_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_session    ON site_visits(session_id);

-- ─── Seed data ───────────────────────────────────────────────────────────────

-- Categories
INSERT INTO categories (id, name, slug, description, type, created_at) VALUES
  ('0dc179c0-89c8-11f1-b975-ce9b80f1b6c8','National Magazine','national-magazine','NUASA official national magazine editions','library','2026-07-27 14:32:54'),
  ('0dc19bce-89c8-11f1-b975-ce9b80f1b6c8','Past Questions','past-questions','Past examination questions and answers','library','2026-07-27 14:32:54'),
  ('0dc19e05-89c8-11f1-b975-ce9b80f1b6c8','Research Papers','research-papers','Academic research and scholarly articles','library','2026-07-27 14:32:54'),
  ('0dc19eef-89c8-11f1-b975-ce9b80f1b6c8','Study Guides','study-guides','Study guides and revision materials','library','2026-07-27 14:32:54'),
  ('0dc19fa5-89c8-11f1-b975-ce9b80f1b6c8','Academic Resources','academic-resources','Lecture notes, textbooks, and reference materials','library','2026-07-27 14:32:54'),
  ('0dc1a05e-89c8-11f1-b975-ce9b80f1b6c8','News & Updates','news-updates','Latest news and official announcements from NUASA','blog','2026-07-27 14:32:54'),
  ('0dc1a10f-89c8-11f1-b975-ce9b80f1b6c8','Academic Tips','academic-tips','Tips and strategies for academic excellence','blog','2026-07-27 14:32:54'),
  ('0dc1a1b4-89c8-11f1-b975-ce9b80f1b6c8','Career Development','career-development','Career guidance and professional development for accounting students','blog','2026-07-27 14:32:54'),
  ('0dc1a273-89c8-11f1-b975-ce9b80f1b6c8','Exam Preparation','exam-preparation','ICAN, ATSWA and other professional exam prep resources','blog','2026-07-27 14:32:54'),
  ('0dc1a31e-89c8-11f1-b975-ce9b80f1b6c8','Student Life','student-life','Stories and experiences from NUASA student members','blog','2026-07-27 14:32:54'),
  ('0dc1a3dd-89c8-11f1-b975-ce9b80f1b6c8','Accounting & Finance','accounting-finance','Core accounting and finance topics','both','2026-07-27 14:32:54'),
  ('0dc1a48a-89c8-11f1-b975-ce9b80f1b6c8','NUASA Events','nuasa-events','Events, conventions, and programmes organised by NUASA','both','2026-07-27 14:32:54')
ON CONFLICT (id) DO NOTHING;

-- Executives
INSERT INTO executives (id, full_name, position, image_url, sort_order, is_active, created_at, updated_at) VALUES
  ('50300cbf-89b7-11f1-a598-76fc6205b25c','Saliman Sukura ACA.','Vice President','https://i.pinimg.com/736x/46/fa/de/46fadeda2573cbe343b9a58f2f27ea6c.jpg',1,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('5030227e-89b7-11f1-a598-76fc6205b25c','IWEKHAO ROTIMI RAYMOND','Director of Sports','https://i.pinimg.com/736x/55/0a/96/550a96115012cc2551bd1bfe31907ba9.jpg',2,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('503025a0-89b7-11f1-a598-76fc6205b25c','Adekunle Adewale','National PRO II','https://i.pinimg.com/736x/a3/5f/2f/a35f2f63df0292bcbf63c4f2ba071005.jpg',3,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302612-89b7-11f1-a598-76fc6205b25c','Monday Inusa','Vice President, North Central','https://i.pinimg.com/736x/02/22/95/022295fe890136d2ba80c7c3b1c50d32.jpg',4,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('5030272a-89b7-11f1-a598-76fc6205b25c','Isabu Divinepower Chinemerem','Director of Welfare','https://i.pinimg.com/736x/94/26/c3/9426c31bf50500161833c3156b472987.jpg',5,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('5030279f-89b7-11f1-a598-76fc6205b25c','Kayang lilian','Miss NUASA National','https://i.pinimg.com/736x/ea/3a/9e/ea3a9ecbc84a733f455eac40d48a0e1a.jpg',6,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('503027ff-89b7-11f1-a598-76fc6205b25c','ANYA VICTOR ORJII','Mr NUASA National','https://i.pinimg.com/736x/f6/db/7b/f6db7b3aab2579e958ef34cc46c316f9.jpg',7,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302873-89b7-11f1-a598-76fc6205b25c','Oma-Benedi Jessica Eyikojowan','Ex-Officio II','https://i.pinimg.com/736x/80/a1/8c/80a18c47a2d21ef19f2a8f2da61745fb.jpg',8,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302a2e-89b7-11f1-a598-76fc6205b25c','Aisha Olabimpe Abolarinwa','Ex-Officio I','https://i.pinimg.com/736x/ab/a1/00/aba100828eff381bd3207ae7f773d4c4.jpg',9,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302adb-89b7-11f1-a598-76fc6205b25c','Lukman Olarongbe ACA.','Immediate Past President','https://i.pinimg.com/736x/84/a1/18/84a118bfbad2912960f58f40ff5fdb08.jpg',10,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302b2a-89b7-11f1-a598-76fc6205b25c','Olotu Zion Iremide','Public Relations Officer','https://i.pinimg.com/736x/f0/a5/4c/f0a54c3b2dd9781458ae3670f780f10d.jpg',11,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302b74-89b7-11f1-a598-76fc6205b25c','Mustapha Sanni Orahachi','Deputy Financial Secretary','https://i.pinimg.com/736x/94/3e/dd/943edd23f49f8126223eab5dda0a5fac.jpg',12,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302bbe-89b7-11f1-a598-76fc6205b25c','lorwase Maureen Msurshima','Deputy Director of Socials','https://i.pinimg.com/736x/62/4c/9d/624c9d894ec78430289487716daaeb5e.jpg',13,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302c19-89b7-11f1-a598-76fc6205b25c','JOHN SAMUEL FRIDAY','Director of Socials','https://i.pinimg.com/736x/bf/aa/11/bfaa11e2c9c269dda45ed8592b34fd98.jpg',14,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302c65-89b7-11f1-a598-76fc6205b25c','Abubakar Abdulranman Shamaki','Director of Research','https://i.pinimg.com/736x/f8/84/c6/f884c61d6bd668a4b9462742ae692f11.jpg',15,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302cac-89b7-11f1-a598-76fc6205b25c','Abani Mitchell Okereke','Financial Secretary','https://i.pinimg.com/736x/25/97/62/259762b7300c5e7cb5fc12d29b327094.jpg',16,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302cf3-89b7-11f1-a598-76fc6205b25c','LAMVONG TIMJUL TIMOTHY','Treasurer','https://i.pinimg.com/736x/9b/19/ab/9b19abaeba5ee627b8cae44b4cb77a0d.jpg',17,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302d42-89b7-11f1-a598-76fc6205b25c','Eze Chidubem Favour','Vice President, South East','https://i.pinimg.com/736x/12/53/ce/1253ce90572a71402c74b5e28e629837.jpg',18,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302d88-89b7-11f1-a598-76fc6205b25c','DORCAS SONGO MCLEAN','Vice President, South South','https://i.pinimg.com/736x/02/a5/ea/02a5ea1ec6effa80ff7447894110bfc7.jpg',19,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302dcb-89b7-11f1-a598-76fc6205b25c','Ukahi Treasure Okpeje','Vice President, South West','https://i.pinimg.com/736x/84/19/87/8419873adca7c83ce57706d7196df6e8.jpg',20,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50302e10-89b7-11f1-a598-76fc6205b25c','Obielozie Florence Chisom','Vice President, North West','https://i.pinimg.com/736x/c0/b3/2d/c0b32de6baae1b5ca37c29fb90063a62.jpg',21,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('503031b2-89b7-11f1-a598-76fc6205b25c','Suleman Ahmed Jidda','Vice President, North East','https://i.pinimg.com/736x/e8/29/76/e829764629a66a5ea0ba8515e9d4a4ee.jpg',22,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('50303227-89b7-11f1-a598-76fc6205b25c','Alaribe christabel Chioma','Deputy Secretary General','https://i.pinimg.com/736x/0e/54/b4/0e54b451f942f8f48714d41642b85f5d.jpg',23,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('5030327b-89b7-11f1-a598-76fc6205b25c','USMAN ABUBAKAR SODIQ','Secretary General','https://i.pinimg.com/736x/db/01/70/db0170aa7c6138bc5c20a23c2dc86c42.jpg',24,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04'),
  ('503032da-89b7-11f1-a598-76fc6205b25c','Ruth Stephen','Assistant Director of Research','https://i.pinimg.com/736x/23/fb/52/23fb522850aee7c1ce3238e074e3a8c1.jpg',25,TRUE,'2026-07-27 12:33:04','2026-07-27 12:33:04')
ON CONFLICT (id) DO NOTHING;

-- Admin user
INSERT INTO users (id, email, password_hash, email_verified, created_at, updated_at) VALUES
  ('cea01ddb-aadd-4fbe-8624-8b0ba7480f2a','youngicthub@gmail.com','$2b$12$bTfGETUElH5b5KbrTI6EFe/R7CuERBnRlaEl6Og0b5TIAxNcxwk02',TRUE,'2026-07-27 16:40:38','2026-07-27 16:40:38')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, user_id, full_name, email, created_at, updated_at) VALUES
  ('53174e46-8226-4ea9-a550-2428acb797fb','cea01ddb-aadd-4fbe-8624-8b0ba7480f2a','Admin NUASA','youngicthub@gmail.com','2026-07-27 16:40:38','2026-07-27 16:40:38')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (id, user_id, role, created_at) VALUES
  ('8b00f5de-46ba-44bf-87f7-d0da16056ed5','cea01ddb-aadd-4fbe-8624-8b0ba7480f2a','admin','2026-07-27 16:40:38')
ON CONFLICT (id) DO NOTHING;
