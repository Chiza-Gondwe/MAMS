CREATE DATABASE IF NOT EXISTS mams_db;
CREATE USER IF NOT EXISTS 'mams_user'@'localhost' IDENTIFIED BY 'mams_password';
GRANT ALL PRIVILEGES ON mams_db.* TO 'mams_user'@'localhost';
FLUSH PRIVILEGES;
