-- MySQL 8+
CREATE DATABASE IF NOT EXISTS edu_platform_demo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE edu_platform_demo;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role ENUM('admin','instructor','student') NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  username VARCHAR(60) NULL UNIQUE,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_image_url VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE instructor_profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  title VARCHAR(120) NULL,
  expertise VARCHAR(255) NULL,
  hourly_rate DECIMAL(10,2) NULL,
  bio TEXT NULL,
  is_approved TINYINT(1) NOT NULL DEFAULT 0,
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_instructor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_instructor_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE student_profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  education_level VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE lesson_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  assigned_instructor_id BIGINT UNSIGNED NULL,
  topic VARCHAR(150) NOT NULL,
  notes TEXT NULL,
  preferred_date DATE NULL,
  preferred_time TIME NULL,
  approved_slot_start DATETIME NULL,
  approved_slot_end DATETIME NULL,
  status ENUM('pending','approved','rejected','postponed','cancelled','completed') NOT NULL DEFAULT 'pending',
  postpone_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_request_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_request_instructor FOREIGN KEY (assigned_instructor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_requests_student (student_id),
  INDEX idx_requests_instructor (assigned_instructor_id),
  INDEX idx_requests_status (status),
  INDEX idx_requests_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE lesson_request_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id BIGINT UNSIGNED NOT NULL,
  old_status ENUM('pending','approved','rejected','postponed','cancelled','completed') NULL,
  new_status ENUM('pending','approved','rejected','postponed','cancelled','completed') NOT NULL,
  changed_by BIGINT UNSIGNED NOT NULL,
  note VARCHAR(255) NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_req_hist_request FOREIGN KEY (request_id) REFERENCES lesson_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_req_hist_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_req_hist_request (request_id),
  INDEX idx_req_hist_changed_at (changed_at)
) ENGINE=InnoDB;

CREATE TABLE live_lessons (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id BIGINT UNSIGNED NULL,
  instructor_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  meeting_url VARCHAR(500) NULL,
  status ENUM('scheduled','completed','cancelled','postponed') NOT NULL DEFAULT 'scheduled',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_live_request FOREIGN KEY (request_id) REFERENCES lesson_requests(id) ON DELETE SET NULL,
  CONSTRAINT fk_live_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_live_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_live_instructor_time (instructor_id, start_at),
  INDEX idx_live_student_time (student_id, start_at)
) ENGINE=InnoDB;

CREATE TABLE payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lesson_request_id BIGINT UNSIGNED NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  instructor_id BIGINT UNSIGNED NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'TRY',
  status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  provider VARCHAR(50) NULL,
  provider_ref VARCHAR(120) NULL,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_request FOREIGN KEY (lesson_request_id) REFERENCES lesson_requests(id) ON DELETE SET NULL,
  CONSTRAINT fk_pay_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pay_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_provider_ref (provider, provider_ref),
  INDEX idx_pay_status (status),
  INDEX idx_pay_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE announcements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  content TEXT NOT NULL,
  audience ENUM('all','students','instructors','admins') NOT NULL DEFAULT 'all',
  priority ENUM('normal','important','critical') NOT NULL DEFAULT 'normal',
  publish_at DATETIME NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_announcement_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_announcement_published (is_published, publish_at)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  channel ENUM('email','sms','in_app') NOT NULL,
  type VARCHAR(80) NOT NULL,
  subject VARCHAR(180) NULL,
  message TEXT NOT NULL,
  status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notification_user (user_id, created_at),
  INDEX idx_notification_status (status, channel)
) ENGINE=InnoDB;
