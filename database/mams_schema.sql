-- ============================================================
-- MAMS — Membership Affiliation and Management System
-- MySQL Database Schema
-- University of Zambia | CSC 4004 | 2026
-- Author: Chiza Gondwe
-- ============================================================

CREATE DATABASE IF NOT EXISTS mams_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mams_v2;

-- ============================================================
-- 1. ORGANISATION
-- Top-level entity. Every other record belongs to an org.
-- ============================================================
CREATE TABLE organisation (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    name        VARCHAR(150)    NOT NULL,
    type        ENUM('CHURCH', 'PTA') NOT NULL,
    address     VARCHAR(255),
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- ============================================================
-- 2. BRANCH
-- Sub-group within an organisation (e.g. Youth Ministry, Women's Guild).
-- ============================================================
CREATE TABLE branch (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    org_id      INT UNSIGNED    NOT NULL,
    name        VARCHAR(150)    NOT NULL,
    description VARCHAR(255),
    PRIMARY KEY (id),
    CONSTRAINT fk_branch_org
        FOREIGN KEY (org_id) REFERENCES organisation (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_branch_org (org_id)
);

-- ============================================================
-- 3. USER
-- Authentication table. Stores login credentials and role.
-- Roles: ADMIN (full access), LEADER (branch-level), MEMBER (read-only).
-- ============================================================
CREATE TABLE user (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    username        VARCHAR(80)     NOT NULL UNIQUE,
    email           VARCHAR(150)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            ENUM('ADMIN', 'LEADER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_user_email (email),
    INDEX idx_user_role  (role)
);

-- ============================================================
-- 4. MEMBER
-- Member profile. One-to-one with user. Belongs to an org and branch.
-- ============================================================
CREATE TABLE member (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED    NOT NULL UNIQUE,
    org_id      INT UNSIGNED    NOT NULL,
    branch_id   INT UNSIGNED,
    first_name  VARCHAR(80)     NOT NULL,
    last_name   VARCHAR(80)     NOT NULL,
    phone       VARCHAR(20),
    address     VARCHAR(255),
    joined_date DATE            NOT NULL DEFAULT (CURRENT_DATE),
    PRIMARY KEY (id),
    CONSTRAINT fk_member_user
        FOREIGN KEY (user_id)   REFERENCES user         (id) ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_member_org
        FOREIGN KEY (org_id)    REFERENCES organisation (id) ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_member_branch
        FOREIGN KEY (branch_id) REFERENCES branch       (id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_member_org    (org_id),
    INDEX idx_member_branch (branch_id)
);

-- ============================================================
-- 5. EVENT
-- Meeting or service. Used as the anchor for attendance.
-- ============================================================
CREATE TABLE event (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    org_id      INT UNSIGNED    NOT NULL,
    created_by  INT UNSIGNED    NOT NULL,
    title       VARCHAR(150)    NOT NULL,
    event_date  DATETIME        NOT NULL,
    location    VARCHAR(255),
    PRIMARY KEY (id),
    CONSTRAINT fk_event_org
        FOREIGN KEY (org_id)    REFERENCES organisation (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_event_user
        FOREIGN KEY (created_by) REFERENCES user        (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_event_org  (org_id),
    INDEX idx_event_date (event_date)
);

-- ============================================================
-- 6. ATTENDANCE
-- Records a member's check-in to an event.
-- method: QR (scanned via Flutter app) or MANUAL (entered by admin).
-- ============================================================
CREATE TABLE attendance (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    member_id       INT UNSIGNED    NOT NULL,
    event_id        INT UNSIGNED    NOT NULL,
    checked_in_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    method          ENUM('QR', 'MANUAL') NOT NULL DEFAULT 'QR',
    PRIMARY KEY (id),
    UNIQUE KEY uq_attendance (member_id, event_id),
    CONSTRAINT fk_attendance_member
        FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_attendance_event
        FOREIGN KEY (event_id)  REFERENCES event  (id) ON DELETE CASCADE  ON UPDATE CASCADE,
    INDEX idx_attendance_event  (event_id),
    INDEX idx_attendance_member (member_id)
);

-- ============================================================
-- 7. CONTRIBUTION_CATEGORY
-- Defines contribution types per org (e.g. Tithe, Levy, Offering).
-- ============================================================
CREATE TABLE contribution_category (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    org_id      INT UNSIGNED    NOT NULL,
    name        VARCHAR(100)    NOT NULL,
    description VARCHAR(255),
    PRIMARY KEY (id),
    CONSTRAINT fk_category_org
        FOREIGN KEY (org_id) REFERENCES organisation (id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_category_org (org_id)
);

-- ============================================================
-- 8. CONTRIBUTION
-- Records a single contribution made by a member.
-- recorded_by: the admin/treasurer who logged the entry.
-- ============================================================
CREATE TABLE contribution (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    member_id       INT UNSIGNED        NOT NULL,
    category_id     INT UNSIGNED        NOT NULL,
    recorded_by     INT UNSIGNED        NOT NULL,
    amount          DECIMAL(10, 2)      NOT NULL CHECK (amount > 0),
    contribution_date DATE              NOT NULL DEFAULT (CURRENT_DATE),
    notes           VARCHAR(255),
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_contribution_member
        FOREIGN KEY (member_id)   REFERENCES member                  (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_contribution_category
        FOREIGN KEY (category_id) REFERENCES contribution_category   (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_contribution_recorder
        FOREIGN KEY (recorded_by) REFERENCES user                    (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_contribution_member   (member_id),
    INDEX idx_contribution_category (category_id),
    INDEX idx_contribution_date     (contribution_date)
);

-- ============================================================
-- 9. ANNOUNCEMENT
-- Text or video broadcast sent to org members.
-- type: TEXT or VIDEO.
-- ============================================================
CREATE TABLE announcement (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    org_id      INT UNSIGNED    NOT NULL,
    created_by  INT UNSIGNED    NOT NULL,
    title       VARCHAR(150)    NOT NULL,
    body        TEXT,
    type        ENUM('TEXT', 'VIDEO') NOT NULL DEFAULT 'TEXT',
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_announcement_org
        FOREIGN KEY (org_id)    REFERENCES organisation (id) ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_announcement_user
        FOREIGN KEY (created_by) REFERENCES user        (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_announcement_org  (org_id),
    INDEX idx_announcement_date (created_at)
);

-- ============================================================
-- 10. ANNOUNCEMENT_MEDIA
-- Video files attached to announcements.
-- media_url points to Oracle Cloud Object Storage.
-- ============================================================
CREATE TABLE announcement_media (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    announcement_id     INT UNSIGNED    NOT NULL,
    media_url           VARCHAR(500)    NOT NULL,
    duration_secs       INT UNSIGNED,
    PRIMARY KEY (id),
    CONSTRAINT fk_media_announcement
        FOREIGN KEY (announcement_id) REFERENCES announcement (id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_media_announcement (announcement_id)
);

-- ============================================================
-- 11. SECTION
-- Sub-group specific to CHURCH organisations.
-- A section has a name, description and a designated leader.
-- ============================================================
CREATE TABLE section (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    org_id      INT UNSIGNED NOT NULL,
    name        VARCHAR(150) NOT NULL,
    description VARCHAR(255),
    leader_id   INT UNSIGNED,
    PRIMARY KEY (id),
    CONSTRAINT fk_section_org
        FOREIGN KEY (org_id)    REFERENCES organisation (id) ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_section_leader
        FOREIGN KEY (leader_id) REFERENCES member       (id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_section_org    (org_id),
    INDEX idx_section_leader (leader_id)
);

-- ============================================================
-- 12. MEMBER_SECTION
-- Linking table — a member can belong to multiple sections.
-- Specific to CHURCH organisations.
-- ============================================================
CREATE TABLE member_section (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    member_id   INT UNSIGNED NOT NULL,
    section_id  INT UNSIGNED NOT NULL,
    joined_date DATE         NOT NULL DEFAULT (CURRENT_DATE),
    PRIMARY KEY (id),
    UNIQUE KEY uq_member_section (member_id, section_id),
    CONSTRAINT fk_ms_member
        FOREIGN KEY (member_id)  REFERENCES member  (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ms_section
        FOREIGN KEY (section_id) REFERENCES section (id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_ms_member  (member_id),
    INDEX idx_ms_section (section_id)
);
