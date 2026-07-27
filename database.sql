-- MySQL dump 10.13  Distrib 8.0.42, for Linux (x86_64)
--
-- Host: localhost    Database: nuasa_database
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_login_log`
--

DROP TABLE IF EXISTS `admin_login_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_login_log` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_login_log_user` (`user_id`),
  KEY `idx_admin_login_log_created` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_login_log`
--

LOCK TABLES `admin_login_log` WRITE;
/*!40000 ALTER TABLE `admin_login_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_login_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `app_settings`
--

DROP TABLE IF EXISTS `app_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_settings` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` json NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app_settings`
--

LOCK TABLES `app_settings` WRITE;
/*!40000 ALTER TABLE `app_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `app_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_tokens`
--

DROP TABLE IF EXISTS `auth_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_tokens` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_auth_tokens_user_id` (`user_id`),
  KEY `idx_auth_tokens_hash` (`token_hash`),
  CONSTRAINT `fk_auth_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_tokens`
--

LOCK TABLES `auth_tokens` WRITE;
/*!40000 ALTER TABLE `auth_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blog_post_tags`
--

DROP TABLE IF EXISTS `blog_post_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blog_post_tags` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tag_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blog_post_tags` (`post_id`,`tag_id`),
  KEY `idx_blog_post_tags_tag` (`tag_id`),
  CONSTRAINT `fk_blog_post_tags_post` FOREIGN KEY (`post_id`) REFERENCES `blog_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_blog_post_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blog_post_tags`
--

LOCK TABLES `blog_post_tags` WRITE;
/*!40000 ALTER TABLE `blog_post_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `blog_post_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blog_posts`
--

DROP TABLE IF EXISTS `blog_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blog_posts` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `excerpt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cover_image` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `author_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `read_time` int NOT NULL DEFAULT '5',
  `views` int NOT NULL DEFAULT '0',
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_blog_posts_slug` (`slug`),
  KEY `idx_blog_posts_status` (`status`),
  KEY `idx_blog_posts_author` (`author_id`),
  KEY `idx_blog_posts_published` (`published_at` DESC),
  KEY `fk_blog_posts_category` (`category_id`),
  CONSTRAINT `fk_blog_posts_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blog_posts`
--

LOCK TABLES `blog_posts` WRITE;
/*!40000 ALTER TABLE `blog_posts` DISABLE KEYS */;
/*!40000 ALTER TABLE `blog_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'both',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_categories_slug` (`slug`),
  KEY `idx_categories_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES ('0dc179c0-89c8-11f1-b975-ce9b80f1b6c8','National Magazine','national-magazine','NUASA official national magazine editions','library','2026-07-27 14:32:54'),('0dc19bce-89c8-11f1-b975-ce9b80f1b6c8','Past Questions','past-questions','Past examination questions and answers','library','2026-07-27 14:32:54'),('0dc19e05-89c8-11f1-b975-ce9b80f1b6c8','Research Papers','research-papers','Academic research and scholarly articles','library','2026-07-27 14:32:54'),('0dc19eef-89c8-11f1-b975-ce9b80f1b6c8','Study Guides','study-guides','Study guides and revision materials','library','2026-07-27 14:32:54'),('0dc19fa5-89c8-11f1-b975-ce9b80f1b6c8','Academic Resources','academic-resources','Lecture notes, textbooks, and reference materials','library','2026-07-27 14:32:54'),('0dc1a05e-89c8-11f1-b975-ce9b80f1b6c8','News & Updates','news-updates','Latest news and official announcements from NUASA','blog','2026-07-27 14:32:54'),('0dc1a10f-89c8-11f1-b975-ce9b80f1b6c8','Academic Tips','academic-tips','Tips and strategies for academic excellence','blog','2026-07-27 14:32:54'),('0dc1a1b4-89c8-11f1-b975-ce9b80f1b6c8','Career Development','career-development','Career guidance and professional development for accounting students','blog','2026-07-27 14:32:54'),('0dc1a273-89c8-11f1-b975-ce9b80f1b6c8','Exam Preparation','exam-preparation','ICAN, ATSWA and other professional exam prep resources','blog','2026-07-27 14:32:54'),('0dc1a31e-89c8-11f1-b975-ce9b80f1b6c8','Student Life','student-life','Stories and experiences from NUASA student members','blog','2026-07-27 14:32:54'),('0dc1a3dd-89c8-11f1-b975-ce9b80f1b6c8','Accounting & Finance','accounting-finance','Core accounting and finance topics','both','2026-07-27 14:32:54'),('0dc1a48a-89c8-11f1-b975-ce9b80f1b6c8','NUASA Events','nuasa-events','Events, conventions, and programmes organised by NUASA','both','2026-07-27 14:32:54');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chapters`
--

DROP TABLE IF EXISTS `chapters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chapters` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `university` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `group_picture_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `established_year` int DEFAULT NULL,
  `contact_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `member_count` int NOT NULL DEFAULT '0',
  `social_links` json DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_chapters_slug` (`slug`),
  KEY `idx_chapters_active` (`is_active`,`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chapters`
--

LOCK TABLES `chapters` WRITE;
/*!40000 ALTER TABLE `chapters` DISABLE KEYS */;
/*!40000 ALTER TABLE `chapters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `convention_registrations`
--

DROP TABLE IF EXISTS `convention_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `convention_registrations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `registration_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `institution` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chapter_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delegates_count` int NOT NULL DEFAULT '1',
  `delegates` json DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NGN',
  `payment_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `tx_ref` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `flw_transaction_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `gender` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `matric_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `graduation_year` int DEFAULT NULL,
  `accommodation_request` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `emergency_contact_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `breakout_session` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tx_ref` (`tx_ref`),
  UNIQUE KEY `reference_code` (`reference_code`),
  KEY `idx_conv_reg_user` (`user_id`),
  KEY `idx_conv_reg_status` (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `convention_registrations`
--

LOCK TABLES `convention_registrations` WRITE;
/*!40000 ALTER TABLE `convention_registrations` DISABLE KEYS */;
INSERT INTO `convention_registrations` VALUES ('d1000001-0000-4000-d000-000000000001','a1000001-0000-4000-a000-000000000001','student','Onwe Goodness Idagbo','onwegoodnessidagbo@gmail.com','08146622290',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1783623956149-4dfd1n',NULL,'NUASA-REG-2026-001',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Investment Banking & Capital Markets','2026-07-09 00:00:00','2026-07-27 12:16:56'),('d1000001-0000-4000-d000-000000000002','a1000001-0000-4000-a000-000000000002','student','Zubair Fatiha Ayomide','zubairfatiha502@gmail.com','09039431251',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1783726414781-eh1jdp',NULL,'NUASA-REG-2026-002',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Taxation & Revenue Administration','2026-07-11 00:00:00','2026-07-27 12:16:56'),('d1000001-0000-4000-d000-000000000003','a1000001-0000-4000-a000-000000000003','student','Victor Akachi Ekwunife','ekwunifevictor250@gmail.com','09161546386',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784047195736-d70d82',NULL,'NUASA-REG-2026-003',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Audit, Risk & Fiscal Governance','2026-07-14 00:00:00','2026-07-27 12:16:56'),('d1000001-0000-4000-d000-000000000004','a1000001-0000-4000-a000-000000000004','student','Atotileto Fathia Oluwajuwonlo','fathiaoluwajuwonloatotileto@gmail.com','08116313514',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784204123062-ttza85',NULL,'NUASA-REG-2026-004',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Consulting & Business Advisory','2026-07-14 00:00:00','2026-07-27 12:16:56'),('d1000001-0000-4000-d000-000000000005','a1000001-0000-4000-a000-000000000005','student','Akpa Stella Chiamaka','akpastella229@gmail.com','08169972974',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784223874178-h13j3x',NULL,'NUASA-REG-2026-005',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Data Analytics, Technology & Digital Finance','2026-07-16 00:00:00','2026-07-27 12:16:56'),('d1000001-0000-4000-d000-000000000006','a1000001-0000-4000-a000-000000000006','student','Lateef Nasirat Opeyemi','lateefnasirat2002@gmail.com','08138057535',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784643838988-r831j6',NULL,'NUASA-REG-2026-006',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Investment Banking & Capital Markets','2026-07-18 00:00:00','2026-07-27 12:16:56'),('d1000001-0000-4000-d000-000000000007','a1000001-0000-4000-a000-000000000007','student','Firdaos Adeniran Adetoro','firdaosadeniran2@gmail.com','09136544715',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784657679059-xstqva',NULL,'NUASA-REG-2026-007',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Taxation & Revenue Administration','2026-07-08 00:00:00','2026-07-27 12:16:56'),('d1000001-0000-4000-d000-000000000008','a1000001-0000-4000-a000-000000000008','student','Ekundayo Glory Eseohe','ekundayoglory8@gmail.com','09064847109',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784839158028-55s2ks',NULL,'NUASA-REG-2026-008',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Audit, Risk & Fiscal Governance','2026-07-23 00:00:00','2026-07-27 12:16:56'),('d1000001-0000-4000-d000-000000000009','a1000001-0000-4000-a000-000000000009','student','Raymond Favour Chinecherem','raymondfavour72@gmail.com','09163858196',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784719914511-tce5wu',NULL,'NUASA-REG-2026-009',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Consulting & Business Advisory','2026-07-22 00:00:00','2026-07-27 12:16:56'),('d1000001-0000-4000-d000-000000000010','a1000001-0000-4000-a000-000000000010','student','Nwokeukwu Chisom Juliet','nwokeukwujuliet@gmail.com','09032849308',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784708531304-km1oha',NULL,'NUASA-REG-2026-010',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Data Analytics, Technology & Digital Finance','2026-07-22 00:00:00','2026-07-27 12:16:56');
/*!40000 ALTER TABLE `convention_registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `location` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cover_image` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `link` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_events_start_time` (`start_time` DESC),
  KEY `idx_events_published` (`is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `executives`
--

DROP TABLE IF EXISTS `executives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `executives` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bio` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `image_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_executives_active` (`is_active`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `executives`
--

LOCK TABLES `executives` WRITE;
/*!40000 ALTER TABLE `executives` DISABLE KEYS */;
INSERT INTO `executives` VALUES ('50300cbf-89b7-11f1-a598-76fc6205b25c','Saliman Sukura ACA.','Vice President',NULL,'https://i.pinimg.com/736x/46/fa/de/46fadeda2573cbe343b9a58f2f27ea6c.jpg',NULL,NULL,1,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('5030227e-89b7-11f1-a598-76fc6205b25c','IWEKHAO ROTIMI RAYMOND','Director of Sports',NULL,'https://i.pinimg.com/736x/55/0a/96/550a96115012cc2551bd1bfe31907ba9.jpg',NULL,NULL,2,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('503025a0-89b7-11f1-a598-76fc6205b25c','Adekunle Adewale','National PRO II',NULL,'https://i.pinimg.com/736x/a3/5f/2f/a35f2f63df0292bcbf63c4f2ba071005.jpg',NULL,NULL,3,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302612-89b7-11f1-a598-76fc6205b25c','Monday Inusa','Vice President, North Central',NULL,'https://i.pinimg.com/736x/02/22/95/022295fe890136d2ba80c7c3b1c50d32.jpg',NULL,NULL,4,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('5030272a-89b7-11f1-a598-76fc6205b25c','Isabu Divinepower Chinemerem','Director of Welfare',NULL,'https://i.pinimg.com/736x/94/26/c3/9426c31bf50500161833c3156b472987.jpg',NULL,NULL,5,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('5030279f-89b7-11f1-a598-76fc6205b25c','Kayang lilian','Miss NUASA National',NULL,'https://i.pinimg.com/736x/ea/3a/9e/ea3a9ecbc84a733f455eac40d48a0e1a.jpg',NULL,NULL,6,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('503027ff-89b7-11f1-a598-76fc6205b25c','ANYA VICTOR ORJII','Mr NUASA National',NULL,'https://i.pinimg.com/736x/f6/db/7b/f6db7b3aab2579e958ef34cc46c316f9.jpg',NULL,NULL,7,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302873-89b7-11f1-a598-76fc6205b25c','Oma-Benedi Jessica Eyikojowan','Ex-Officio II',NULL,'https://i.pinimg.com/736x/80/a1/8c/80a18c47a2d21ef19f2a8f2da61745fb.jpg',NULL,NULL,8,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302a2e-89b7-11f1-a598-76fc6205b25c','Aisha Olabimpe Abolarinwa','Ex-Officio I',NULL,'https://i.pinimg.com/736x/ab/a1/00/aba100828eff381bd3207ae7f773d4c4.jpg',NULL,NULL,9,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302adb-89b7-11f1-a598-76fc6205b25c','Lukman Olarongbe ACA.','Immediate Past President',NULL,'https://i.pinimg.com/736x/84/a1/18/84a118bfbad2912960f58f40ff5fdb08.jpg',NULL,NULL,10,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302b2a-89b7-11f1-a598-76fc6205b25c','Olotu Zion Iremide','Public Relations Officer',NULL,'https://i.pinimg.com/736x/f0/a5/4c/f0a54c3b2dd9781458ae3670f780f10d.jpg',NULL,NULL,11,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302b74-89b7-11f1-a598-76fc6205b25c','Mustapha Sanni Orahachi','Deputy Financial Secretary',NULL,'https://i.pinimg.com/736x/94/3e/dd/943edd23f49f8126223eab5dda0a5fac.jpg',NULL,NULL,12,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302bbe-89b7-11f1-a598-76fc6205b25c','lorwase Maureen Msurshima','Deputy Director of Socials',NULL,'https://i.pinimg.com/736x/62/4c/9d/624c9d894ec78430289487716daaeb5e.jpg',NULL,NULL,13,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302c19-89b7-11f1-a598-76fc6205b25c','JOHN SAMUEL FRIDAY','Director of Socials',NULL,'https://i.pinimg.com/736x/bf/aa/11/bfaa11e2c9c269dda45ed8592b34fd98.jpg',NULL,NULL,14,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302c65-89b7-11f1-a598-76fc6205b25c','Abubakar Abdulranman Shamaki','Director of Research',NULL,'https://i.pinimg.com/736x/f8/84/c6/f884c61d6bd668a4b9462742ae692f11.jpg',NULL,NULL,15,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302cac-89b7-11f1-a598-76fc6205b25c','Abani Mitchell Okereke','Financial Secretary',NULL,'https://i.pinimg.com/736x/25/97/62/259762b7300c5e7cb5fc12d29b327094.jpg',NULL,NULL,16,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302cf3-89b7-11f1-a598-76fc6205b25c','LAMVONG TIMJUL TIMOTHY','Treasurer',NULL,'https://i.pinimg.com/736x/9b/19/ab/9b19abaeba5ee627b8cae44b4cb77a0d.jpg',NULL,NULL,17,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302d42-89b7-11f1-a598-76fc6205b25c','Eze Chidubem Favour','Vice President, South East',NULL,'https://i.pinimg.com/736x/12/53/ce/1253ce90572a71402c74b5e28e629837.jpg',NULL,NULL,18,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302d88-89b7-11f1-a598-76fc6205b25c','DORCAS SONGO MCLEAN','Vice President, South South',NULL,'https://i.pinimg.com/736x/02/a5/ea/02a5ea1ec6effa80ff7447894110bfc7.jpg',NULL,NULL,19,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302dcb-89b7-11f1-a598-76fc6205b25c','Ukahi Treasure Okpeje','Vice President, South West',NULL,'https://i.pinimg.com/736x/84/19/87/8419873adca7c83ce57706d7196df6e8.jpg',NULL,NULL,20,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50302e10-89b7-11f1-a598-76fc6205b25c','Obielozie Florence Chisom','Vice President, North West',NULL,'https://i.pinimg.com/736x/c0/b3/2d/c0b32de6baae1b5ca37c29fb90063a62.jpg',NULL,NULL,21,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('503031b2-89b7-11f1-a598-76fc6205b25c','Suleman Ahmed Jidda','Vice President, North East',NULL,'https://i.pinimg.com/736x/e8/29/76/e829764629a66a5ea0ba8515e9d4a4ee.jpg',NULL,NULL,22,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('50303227-89b7-11f1-a598-76fc6205b25c','Alaribe christabel Chioma','Deputy Secretary General',NULL,'https://i.pinimg.com/736x/0e/54/b4/0e54b451f942f8f48714d41642b85f5d.jpg',NULL,NULL,23,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('5030327b-89b7-11f1-a598-76fc6205b25c','USMAN ABUBAKAR SODIQ','Secretary General',NULL,'https://i.pinimg.com/736x/db/01/70/db0170aa7c6138bc5c20a23c2dc86c42.jpg',NULL,NULL,24,1,'2026-07-27 12:33:04','2026-07-27 12:33:04'),('503032da-89b7-11f1-a598-76fc6205b25c','Ruth Stephen','Assistant Director of Research',NULL,'https://i.pinimg.com/736x/23/fb/52/23fb522850aee7c1ce3238e074e3a8c1.jpg',NULL,NULL,25,1,'2026-07-27 12:33:04','2026-07-27 12:33:04');
/*!40000 ALTER TABLE `executives` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `library_resource_tags`
--

DROP TABLE IF EXISTS `library_resource_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `library_resource_tags` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tag_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_library_resource_tags` (`resource_id`,`tag_id`),
  KEY `idx_library_resource_tags_tag` (`tag_id`),
  CONSTRAINT `fk_library_resource_tags_resource` FOREIGN KEY (`resource_id`) REFERENCES `library_resources` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_library_resource_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `library_resource_tags`
--

LOCK TABLES `library_resource_tags` WRITE;
/*!40000 ALTER TABLE `library_resource_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `library_resource_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `library_resources`
--

DROP TABLE IF EXISTS `library_resources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `library_resources` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `file_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `file_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cover_image` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `course` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `author_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT '0',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `download_count` int NOT NULL DEFAULT '0',
  `view_count` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_library_resources_category` (`category_id`),
  KEY `idx_library_resources_author` (`author_id`),
  KEY `idx_library_resources_public` (`is_public`),
  CONSTRAINT `fk_library_resources_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `library_resources`
--

LOCK TABLES `library_resources` WRITE;
/*!40000 ALTER TABLE `library_resources` DISABLE KEYS */;
/*!40000 ALTER TABLE `library_resources` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `post_views`
--

DROP TABLE IF EXISTS `post_views`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `post_views` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `viewed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post_views_user` (`user_id`,`viewed_at` DESC),
  KEY `idx_post_views_post` (`post_id`),
  CONSTRAINT `fk_post_views_post` FOREIGN KEY (`post_id`) REFERENCES `blog_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `post_views`
--

LOCK TABLES `post_views` WRITE;
/*!40000 ALTER TABLE `post_views` DISABLE KEYS */;
/*!40000 ALTER TABLE `post_views` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profiles`
--

DROP TABLE IF EXISTS `profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profiles` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `institution` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `academic_level` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_profiles_user_id` (`user_id`),
  CONSTRAINT `fk_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profiles`
--

LOCK TABLES `profiles` WRITE;
/*!40000 ALTER TABLE `profiles` DISABLE KEYS */;
INSERT INTO `profiles` VALUES ('b1000001-0000-4000-b000-000000000001','a1000001-0000-4000-a000-000000000001','Onwe Goodness Idagbo','onwegoodnessidagbo@gmail.com',NULL,NULL,NULL,'2026-07-09 00:00:00','2026-07-09 00:00:00'),('b1000001-0000-4000-b000-000000000002','a1000001-0000-4000-a000-000000000002','Zubair Fatiha Ayomide','zubairfatiha502@gmail.com',NULL,NULL,NULL,'2026-07-11 00:00:00','2026-07-11 00:00:00'),('b1000001-0000-4000-b000-000000000003','a1000001-0000-4000-a000-000000000003','Victor Akachi Ekwunife','ekwunifevictor250@gmail.com',NULL,NULL,NULL,'2026-07-14 00:00:00','2026-07-14 00:00:00'),('b1000001-0000-4000-b000-000000000004','a1000001-0000-4000-a000-000000000004','Atotileto Fathia Oluwajuwonlo','fathiaoluwajuwonloatotileto@gmail.com',NULL,NULL,NULL,'2026-07-14 00:00:00','2026-07-14 00:00:00'),('b1000001-0000-4000-b000-000000000005','a1000001-0000-4000-a000-000000000005','Akpa Stella Chiamaka','akpastella229@gmail.com',NULL,NULL,NULL,'2026-07-16 00:00:00','2026-07-16 00:00:00'),('b1000001-0000-4000-b000-000000000006','a1000001-0000-4000-a000-000000000006','Lateef Nasirat Opeyemi','lateefnasirat2002@gmail.com',NULL,NULL,NULL,'2026-07-18 00:00:00','2026-07-18 00:00:00'),('b1000001-0000-4000-b000-000000000007','a1000001-0000-4000-a000-000000000007','Firdaos Adeniran Adetoro','firdaosadeniran2@gmail.com',NULL,NULL,NULL,'2026-07-08 00:00:00','2026-07-08 00:00:00'),('b1000001-0000-4000-b000-000000000008','a1000001-0000-4000-a000-000000000008','Ekundayo Glory Eseohe','ekundayoglory8@gmail.com',NULL,NULL,NULL,'2026-07-23 00:00:00','2026-07-23 00:00:00'),('b1000001-0000-4000-b000-000000000009','a1000001-0000-4000-a000-000000000009','Raymond Favour Chinecherem','raymondfavour72@gmail.com',NULL,NULL,NULL,'2026-07-22 00:00:00','2026-07-22 00:00:00'),('b1000001-0000-4000-b000-000000000010','a1000001-0000-4000-a000-000000000010','Nwokeukwu Chisom Juliet','nwokeukwujuliet@gmail.com',NULL,NULL,NULL,'2026-07-22 00:00:00','2026-07-22 00:00:00');
/*!40000 ALTER TABLE `profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resource_downloads`
--

DROP TABLE IF EXISTS `resource_downloads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resource_downloads` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `downloaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_resource_downloads_user` (`user_id`,`downloaded_at` DESC),
  KEY `idx_resource_downloads_resource` (`resource_id`),
  CONSTRAINT `fk_resource_downloads_resource` FOREIGN KEY (`resource_id`) REFERENCES `library_resources` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resource_downloads`
--

LOCK TABLES `resource_downloads` WRITE;
/*!40000 ALTER TABLE `resource_downloads` DISABLE KEYS */;
/*!40000 ALTER TABLE `resource_downloads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resource_views`
--

DROP TABLE IF EXISTS `resource_views`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resource_views` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `viewed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_resource_views_resource` (`resource_id`),
  KEY `idx_resource_views_user` (`user_id`),
  CONSTRAINT `fk_resource_views_resource` FOREIGN KEY (`resource_id`) REFERENCES `library_resources` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resource_views`
--

LOCK TABLES `resource_views` WRITE;
/*!40000 ALTER TABLE `resource_views` DISABLE KEYS */;
/*!40000 ALTER TABLE `resource_views` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saved_posts`
--

DROP TABLE IF EXISTS `saved_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saved_posts` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_saved_posts` (`user_id`,`post_id`),
  KEY `idx_saved_posts_user` (`user_id`),
  KEY `fk_saved_posts_post` (`post_id`),
  CONSTRAINT `fk_saved_posts_post` FOREIGN KEY (`post_id`) REFERENCES `blog_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_posts`
--

LOCK TABLES `saved_posts` WRITE;
/*!40000 ALTER TABLE `saved_posts` DISABLE KEYS */;
/*!40000 ALTER TABLE `saved_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saved_resources`
--

DROP TABLE IF EXISTS `saved_resources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saved_resources` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_saved_resources` (`user_id`,`resource_id`),
  KEY `idx_saved_resources_user` (`user_id`),
  KEY `fk_saved_resources_resource` (`resource_id`),
  CONSTRAINT `fk_saved_resources_resource` FOREIGN KEY (`resource_id`) REFERENCES `library_resources` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_resources`
--

LOCK TABLES `saved_resources` WRITE;
/*!40000 ALTER TABLE `saved_resources` DISABLE KEYS */;
/*!40000 ALTER TABLE `saved_resources` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `site_visits`
--

DROP TABLE IF EXISTS `site_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_visits` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `path` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `referrer` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_site_visits_created_at` (`created_at` DESC),
  KEY `idx_site_visits_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_visits`
--

LOCK TABLES `site_visits` WRITE;
/*!40000 ALTER TABLE `site_visits` DISABLE KEYS */;
INSERT INTO `site_visits` VALUES ('18cc5096-8181-497e-b6ba-a6d195c317af','a1000001-0000-4000-a000-000000000010','df06f94e-e807-4d7a-9b38-6fbdd2aa552d','/convention','https://56ad2e4f-cb9e-4f42-99bd-b4f6b13af4b5-00-1as8o2toa4mft.riker.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 12:23:37'),('29db4e50-49a2-428f-a85d-58125f4951c7',NULL,'5270387b-2984-40f0-9abb-d4084b39b87e','/','https://d978107b-ee91-4f6d-84ec-22a40822e80e-00-15b5ryxluqire.picard.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 14:24:31'),('3a28b32d-de12-42be-bc4f-6b70072ba917',NULL,'5270387b-2984-40f0-9abb-d4084b39b87e','/executives','https://d978107b-ee91-4f6d-84ec-22a40822e80e-00-15b5ryxluqire.picard.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 14:28:42'),('432f40a3-9b6b-4648-a8df-787686efb60f',NULL,'df06f94e-e807-4d7a-9b38-6fbdd2aa552d','/','https://56ad2e4f-cb9e-4f42-99bd-b4f6b13af4b5-00-1as8o2toa4mft.riker.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 12:20:36'),('4e7ac13d-5c1d-4bc3-b590-f25ed38f662d',NULL,'5270387b-2984-40f0-9abb-d4084b39b87e','/library','https://d978107b-ee91-4f6d-84ec-22a40822e80e-00-15b5ryxluqire.picard.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 14:30:22'),('7f524eb6-199f-4da7-8cd1-6229924c7346',NULL,'5270387b-2984-40f0-9abb-d4084b39b87e','/','https://d978107b-ee91-4f6d-84ec-22a40822e80e-00-15b5ryxluqire.picard.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 14:40:43'),('9cb25a6e-4207-4731-85c5-2250047cd098',NULL,'5270387b-2984-40f0-9abb-d4084b39b87e','/library','https://d978107b-ee91-4f6d-84ec-22a40822e80e-00-15b5ryxluqire.picard.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 14:30:17'),('9fc4101e-b722-4079-a2ea-2d32d132d543',NULL,'dc3db2c8-97f3-4c9d-ac1f-af24b4f4ef52','/','https://www.google.com/','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 12:19:50'),('aa80d36e-423c-4169-9a43-87347433ef16',NULL,'5270387b-2984-40f0-9abb-d4084b39b87e','/','https://d978107b-ee91-4f6d-84ec-22a40822e80e-00-15b5ryxluqire.picard.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 14:30:00'),('b33b802f-91a4-400b-b8a2-d05531158f7d',NULL,'5270387b-2984-40f0-9abb-d4084b39b87e','/','https://d978107b-ee91-4f6d-84ec-22a40822e80e-00-15b5ryxluqire.picard.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 14:30:18'),('ba6cff5e-db18-4296-8592-946b7492ecdd','a1000001-0000-4000-a000-000000000010','df06f94e-e807-4d7a-9b38-6fbdd2aa552d','/dashboard/convention','https://56ad2e4f-cb9e-4f42-99bd-b4f6b13af4b5-00-1as8o2toa4mft.riker.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 12:23:34'),('c27ef9bb-3ef8-4aaa-bc3d-c38c66a0f6a2','a1000001-0000-4000-a000-000000000010','df06f94e-e807-4d7a-9b38-6fbdd2aa552d','/dashboard/convention','https://56ad2e4f-cb9e-4f42-99bd-b4f6b13af4b5-00-1as8o2toa4mft.riker.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 12:23:52'),('e0d76879-c14a-463e-839c-739990792133',NULL,'b6143ab7-5704-4d17-bb69-da5f23f3fd03','/','https://www.google.com/','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 12:13:00'),('e1dd368b-97d3-49eb-ba4b-adc1a9bc6585','a1000001-0000-4000-a000-000000000010','df06f94e-e807-4d7a-9b38-6fbdd2aa552d','/dashboard/convention','https://56ad2e4f-cb9e-4f42-99bd-b4f6b13af4b5-00-1as8o2toa4mft.riker.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 12:26:24'),('fa8fb7f7-a558-40db-995f-8407cfc9c4ab','a1000001-0000-4000-a000-000000000010','df06f94e-e807-4d7a-9b38-6fbdd2aa552d','/dashboard','https://56ad2e4f-cb9e-4f42-99bd-b4f6b13af4b5-00-1as8o2toa4mft.riker.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 12:23:23'),('fc9daa01-bdc5-4ad1-87d9-8a702f0876ee',NULL,'df06f94e-e807-4d7a-9b38-6fbdd2aa552d','/login','https://56ad2e4f-cb9e-4f42-99bd-b4f6b13af4b5-00-1as8o2toa4mft.riker.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 12:20:41'),('fe01d5fd-90cf-41de-be01-16320754495b','a1000001-0000-4000-a000-000000000010','df06f94e-e807-4d7a-9b38-6fbdd2aa552d','/dashboard/convention','https://56ad2e4f-cb9e-4f42-99bd-b4f6b13af4b5-00-1as8o2toa4mft.riker.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 12:26:26');
/*!40000 ALTER TABLE `site_visits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_tags_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tags`
--

LOCK TABLES `tags` WRITE;
/*!40000 ALTER TABLE `tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_roles_user_role` (`user_id`,`role`),
  KEY `idx_user_roles_user_id` (`user_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES ('c1000001-0000-4000-c000-000000000001','a1000001-0000-4000-a000-000000000001','user','2026-07-09 00:00:00'),('c1000001-0000-4000-c000-000000000002','a1000001-0000-4000-a000-000000000002','user','2026-07-11 00:00:00'),('c1000001-0000-4000-c000-000000000003','a1000001-0000-4000-a000-000000000003','user','2026-07-14 00:00:00'),('c1000001-0000-4000-c000-000000000004','a1000001-0000-4000-a000-000000000004','user','2026-07-14 00:00:00'),('c1000001-0000-4000-c000-000000000005','a1000001-0000-4000-a000-000000000005','user','2026-07-16 00:00:00'),('c1000001-0000-4000-c000-000000000006','a1000001-0000-4000-a000-000000000006','user','2026-07-18 00:00:00'),('c1000001-0000-4000-c000-000000000007','a1000001-0000-4000-a000-000000000007','user','2026-07-08 00:00:00'),('c1000001-0000-4000-c000-000000000008','a1000001-0000-4000-a000-000000000008','user','2026-07-23 00:00:00'),('c1000001-0000-4000-c000-000000000009','a1000001-0000-4000-a000-000000000009','user','2026-07-22 00:00:00'),('c1000001-0000-4000-c000-000000000010','a1000001-0000-4000-a000-000000000010','user','2026-07-22 00:00:00');
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('a1000001-0000-4000-a000-000000000001','onwegoodnessidagbo@gmail.com','$2b$12$kt2aC0qWOP2YhLrIkd87QOZP5kPGjPQFUkyJeJhNB.W4dUHmoUgR2',1,'2026-07-09 00:00:00','2026-07-09 00:00:00'),('a1000001-0000-4000-a000-000000000002','zubairfatiha502@gmail.com','$2b$12$kt2aC0qWOP2YhLrIkd87QOZP5kPGjPQFUkyJeJhNB.W4dUHmoUgR2',1,'2026-07-11 00:00:00','2026-07-11 00:00:00'),('a1000001-0000-4000-a000-000000000003','ekwunifevictor250@gmail.com','$2b$12$kt2aC0qWOP2YhLrIkd87QOZP5kPGjPQFUkyJeJhNB.W4dUHmoUgR2',1,'2026-07-14 00:00:00','2026-07-14 00:00:00'),('a1000001-0000-4000-a000-000000000004','fathiaoluwajuwonloatotileto@gmail.com','$2b$12$kt2aC0qWOP2YhLrIkd87QOZP5kPGjPQFUkyJeJhNB.W4dUHmoUgR2',1,'2026-07-14 00:00:00','2026-07-14 00:00:00'),('a1000001-0000-4000-a000-000000000005','akpastella229@gmail.com','$2b$12$kt2aC0qWOP2YhLrIkd87QOZP5kPGjPQFUkyJeJhNB.W4dUHmoUgR2',1,'2026-07-16 00:00:00','2026-07-16 00:00:00'),('a1000001-0000-4000-a000-000000000006','lateefnasirat2002@gmail.com','$2b$12$kt2aC0qWOP2YhLrIkd87QOZP5kPGjPQFUkyJeJhNB.W4dUHmoUgR2',1,'2026-07-18 00:00:00','2026-07-18 00:00:00'),('a1000001-0000-4000-a000-000000000007','firdaosadeniran2@gmail.com','$2b$12$kt2aC0qWOP2YhLrIkd87QOZP5kPGjPQFUkyJeJhNB.W4dUHmoUgR2',1,'2026-07-08 00:00:00','2026-07-08 00:00:00'),('a1000001-0000-4000-a000-000000000008','ekundayoglory8@gmail.com','$2b$12$kt2aC0qWOP2YhLrIkd87QOZP5kPGjPQFUkyJeJhNB.W4dUHmoUgR2',1,'2026-07-23 00:00:00','2026-07-23 00:00:00'),('a1000001-0000-4000-a000-000000000009','raymondfavour72@gmail.com','$2b$12$kt2aC0qWOP2YhLrIkd87QOZP5kPGjPQFUkyJeJhNB.W4dUHmoUgR2',1,'2026-07-22 00:00:00','2026-07-22 00:00:00'),('a1000001-0000-4000-a000-000000000010','nwokeukwujuliet@gmail.com','$2b$12$kt2aC0qWOP2YhLrIkd87QOZP5kPGjPQFUkyJeJhNB.W4dUHmoUgR2',1,'2026-07-22 00:00:00','2026-07-22 00:00:00');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'nuasa_database'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-27 14:45:23
