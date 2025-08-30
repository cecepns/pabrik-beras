-- Database schema for Rice Mill Management System
-- File: database.sql
-- Description: SQL file untuk setup database pabrik beras

-- Create database
CREATE DATABASE IF NOT EXISTS pabrik_beras;
USE pabrik_beras;

-- Table: mesin (machines)
CREATE TABLE IF NOT EXISTS mesin (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kode_mesin VARCHAR(50) UNIQUE NOT NULL,
  dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: pengguna (users)
CREATE TABLE IF NOT EXISTS pengguna (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nama_pengguna VARCHAR(50) UNIQUE NOT NULL,
  kata_sandi VARCHAR(255) NOT NULL,
  nama_lengkap VARCHAR(100) NOT NULL,
  peran ENUM('admin', 'operator') NOT NULL,
  id_mesin_ditugaskan INT NULL,
  dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_mesin_ditugaskan) REFERENCES mesin(id) ON DELETE SET NULL
);

-- Table: pesanan (orders)
CREATE TABLE IF NOT EXISTS pesanan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nama_pelanggan VARCHAR(100) NOT NULL,
  kontak_pelanggan VARCHAR(20) NULL,
  nama_karnet VARCHAR(100) NULL,
  jumlah_karung INT NOT NULL,
  berat_gabah_kg DECIMAL(10,2) NOT NULL,
  lokasi_pengolahan VARCHAR(200) NOT NULL,
  catatan TEXT NULL,
  alamat_pengambilan VARCHAR(300) NOT NULL,
  id_operator INT NOT NULL,
  id_mesin INT NOT NULL,
  status ENUM('Baru') DEFAULT 'Baru',
  dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_operator) REFERENCES pengguna(id) ON DELETE RESTRICT,
  FOREIGN KEY (id_mesin) REFERENCES mesin(id) ON DELETE RESTRICT
);

-- Table: bukti_foto (photo evidence)
CREATE TABLE IF NOT EXISTS bukti_foto (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_pesanan INT NOT NULL,
  url_bukti_foto VARCHAR(255) NOT NULL,
  nama_file VARCHAR(255) NOT NULL,
  ukuran_file INT NOT NULL,
  tipe_file VARCHAR(50) NOT NULL,
  dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pesanan) REFERENCES pesanan(id) ON DELETE CASCADE
);

-- Table: pengaturan (settings)
CREATE TABLE IF NOT EXISTS pengaturan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kunci_pengaturan VARCHAR(50) UNIQUE NOT NULL,
  nilai_pengaturan VARCHAR(50) NOT NULL
);

-- Migration section: Handle legacy data if exists
-- Check if pesanan table has old url_bukti_foto column and remove it if exists
SET @has_old_column = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'pabrik_beras' 
    AND TABLE_NAME = 'pesanan' 
    AND COLUMN_NAME = 'url_bukti_foto'
);

-- If old column exists, remove it (data will be lost, but this is for new installations)
SET @sql = IF(@has_old_column > 0, 'ALTER TABLE pesanan DROP COLUMN url_bukti_foto', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Insert default data

-- Insert default machines
INSERT IGNORE INTO mesin (kode_mesin) VALUES 
('MG-001'),
('MG-002'),
('MG-003');

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO pengguna (nama_pengguna, kata_sandi, nama_lengkap, peran) VALUES 
('admin', '$2b$10$q1jNYWzUOm/6QhKt9YfEdO2dLIB3PU35L2KspL9V73HZ/jhrYczVS', 'Administrator', 'admin');

-- Insert default operator (password: operator123)
INSERT IGNORE INTO pengguna (nama_pengguna, kata_sandi, nama_lengkap, peran, id_mesin_ditugaskan) VALUES 
('operator1', '$2b$10$TNetxZZEZdxVGW5sJX8Mp.AqjfxvtBvG.g7xFxErERV0UTA51sgCm', 'Operator 1', 'operator', 1);

-- Insert default settings
INSERT IGNORE INTO pengaturan (kunci_pengaturan, nilai_pengaturan) VALUES 
('harga_per_kg', '500'),
('konsumsi_bbm_per_kg', '0.1');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pesanan_operator ON pesanan(id_operator);
CREATE INDEX IF NOT EXISTS idx_pesanan_tanggal ON pesanan(dibuat_pada);
CREATE INDEX IF NOT EXISTS idx_pesanan_pelanggan ON pesanan(nama_pelanggan);
CREATE INDEX IF NOT EXISTS idx_bukti_foto_pesanan ON bukti_foto(id_pesanan);

-- Show tables for verification
SHOW TABLES;

-- Show sample data
SELECT 'Mesin:' as info;
SELECT * FROM mesin;

SELECT 'Pengguna:' as info;
SELECT id, nama_pengguna, nama_lengkap, peran FROM pengguna;

SELECT 'Pengaturan:' as info;
SELECT * FROM pengaturan;

SELECT 'Pesanan:' as info;
SELECT id, nama_pelanggan, dibuat_pada FROM pesanan LIMIT 5;

SELECT 'Bukti Foto:' as info;
SELECT * FROM bukti_foto LIMIT 5;
