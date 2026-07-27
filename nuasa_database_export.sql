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
-- Current Database: `nuasa_database`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `nuasa_database` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `nuasa_database`;

--
-- Table structure for table `admin_login_log`
--

DROP TABLE IF EXISTS `admin_login_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_login_log` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` json NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tag_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `excerpt` text COLLATE utf8mb4_unicode_ci,
  `cover_image` text COLLATE utf8mb4_unicode_ci,
  `author_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'both',
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
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chapters`
--

DROP TABLE IF EXISTS `chapters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chapters` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `university` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `group_picture_url` text COLLATE utf8mb4_unicode_ci,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `established_year` int DEFAULT NULL,
  `contact_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `registration_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `institution` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chapter_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delegates_count` int NOT NULL DEFAULT '1',
  `delegates` json DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NGN',
  `payment_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `tx_ref` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `flw_transaction_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `breakout_session` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `matric_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `graduation_year` int DEFAULT NULL,
  `accommodation_request` text COLLATE utf8mb4_unicode_ci,
  `emergency_contact_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
INSERT INTO `convention_registrations` VALUES ('d1000001-0000-4000-d000-000000000001','a1000001-0000-4000-a000-000000000001','student','Onwe Goodness Idagbo','onwegoodnessidagbo@gmail.com','08146622290',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1783623956149-4dfd1n',NULL,'NUASA-REG-2026-001',NULL,'Academic Research & Library Science',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:00','2026-07-27 11:33:08'),('d1000001-0000-4000-d000-000000000002','a1000001-0000-4000-a000-000000000002','student','Zubair Fatiha Ayomide','zubairfatiha502@gmail.com','09039431251',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1783726414781-eh1jdp',NULL,'NUASA-REG-2026-002',NULL,'Career Development & Professional Networking',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-11 00:00:00','2026-07-27 11:33:08'),('d1000001-0000-4000-d000-000000000003','a1000001-0000-4000-a000-000000000003','student','Victor Akachi Ekwunife','ekwunifevictor250@gmail.com','09161546386',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784047195736-d70d82',NULL,'NUASA-REG-2026-003',NULL,'Mental Health & Student Wellbeing',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-14 00:00:00','2026-07-27 11:33:08'),('d1000001-0000-4000-d000-000000000004','a1000001-0000-4000-a000-000000000004','student','Atotileto Fathia Oluwajuwonlo','fathiaoluwajuwonloatotileto@gmail.com','08116313514',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784204123062-ttza85',NULL,'NUASA-REG-2026-004',NULL,'Leadership & Governance in NUASA',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-14 00:00:00','2026-07-27 11:33:08'),('d1000001-0000-4000-d000-000000000005','a1000001-0000-4000-a000-000000000005','student','Akpa Stella Chiamaka','akpastella229@gmail.com','08169972974',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784223874178-h13j3x',NULL,'NUASA-REG-2026-005',NULL,'Innovation & Technology in Library Science',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-16 00:00:00','2026-07-27 11:33:08'),('d1000001-0000-4000-d000-000000000006','a1000001-0000-4000-a000-000000000006','student','Lateef Nasirat Opeyemi','lateefnasirat2002@gmail.com','08138057535',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784643838988-r831j6',NULL,'NUASA-REG-2026-006',NULL,'Academic Research & Library Science',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-18 00:00:00','2026-07-27 11:33:08'),('d1000001-0000-4000-d000-000000000007','a1000001-0000-4000-a000-000000000007','student','Firdaos Adeniran Adetoro','firdaosadeniran2@gmail.com','09136544715',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784657679059-xstqva',NULL,'NUASA-REG-2026-007',NULL,'Career Development & Professional Networking',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-08 00:00:00','2026-07-27 11:33:08'),('d1000001-0000-4000-d000-000000000008','a1000001-0000-4000-a000-000000000008','student','Ekundayo Glory Eseohe','ekundayoglory8@gmail.com','09064847109',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784839158028-55s2ks',NULL,'NUASA-REG-2026-008',NULL,'Mental Health & Student Wellbeing',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-23 00:00:00','2026-07-27 11:33:08'),('d1000001-0000-4000-d000-000000000009','a1000001-0000-4000-a000-000000000009','student','Raymond Favour Chinecherem','raymondfavour72@gmail.com','09163858196',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784719914511-tce5wu',NULL,'NUASA-REG-2026-009',NULL,'Leadership & Governance in NUASA',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-22 00:00:00','2026-07-27 11:33:08'),('d1000001-0000-4000-d000-000000000010','a1000001-0000-4000-a000-000000000010','student','Nwokeukwu Chisom Juliet','nwokeukwujuliet@gmail.com','09032849308',NULL,NULL,1,NULL,300.00,'NGN','successful','NUASA-1784708531304-km1oha',NULL,'NUASA-REG-2026-010',NULL,'Innovation & Technology in Library Science',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-22 00:00:00','2026-07-27 11:33:08');
/*!40000 ALTER TABLE `convention_registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `location` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cover_image` text COLLATE utf8mb4_unicode_ci,
  `link` text COLLATE utf8mb4_unicode_ci,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `image_url` text COLLATE utf8mb4_unicode_ci,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
/*!40000 ALTER TABLE `executives` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `library_resource_tags`
--

DROP TABLE IF EXISTS `library_resource_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `library_resource_tags` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tag_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `file_url` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `file_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cover_image` text COLLATE utf8mb4_unicode_ci,
  `course` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `author_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `institution` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `academic_level` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` text COLLATE utf8mb4_unicode_ci,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `path` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referrer` text COLLATE utf8mb4_unicode_ci,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
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
INSERT INTO `site_visits` VALUES ('1bace2fd-03a3-442d-804f-94a7c635a7f9','a1000001-0000-4000-a000-000000000010','5f19a8a8-7741-453d-975d-a154bb051445','/dashboard','https://e25aceec-b0da-4aa2-b87b-18067aff507f-00-1m3x1blrp81lv.spock.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 11:35:20'),('a5453cf9-7965-460a-b415-9b4cd69dd7ea',NULL,'5f19a8a8-7741-453d-975d-a154bb051445','/','https://e25aceec-b0da-4aa2-b87b-18067aff507f-00-1m3x1blrp81lv.spock.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 11:15:57'),('a61ec6a8-ec1c-42c9-81bf-b0c599871f4c','a1000001-0000-4000-a000-000000000010','5f19a8a8-7741-453d-975d-a154bb051445','/dashboard','https://e25aceec-b0da-4aa2-b87b-18067aff507f-00-1m3x1blrp81lv.spock.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 11:29:36'),('aa9b495f-5629-4fa2-aa1d-02dc6bba14c4',NULL,'5f19a8a8-7741-453d-975d-a154bb051445','/login','https://e25aceec-b0da-4aa2-b87b-18067aff507f-00-1m3x1blrp81lv.spock.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=default-frontend','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-07-27 11:28:54');
/*!40000 ALTER TABLE `site_visits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
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

-- Dump completed on 2026-07-27 11:37:02
