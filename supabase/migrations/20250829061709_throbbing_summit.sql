-- Database schema for Rice Mill Management System

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
  url_bukti_foto VARCHAR(255) NOT NULL,
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

-- Table: pengaturan (settings)
CREATE TABLE IF NOT EXISTS pengaturan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kunci_pengaturan VARCHAR(50) UNIQUE NOT NULL,
  nilai_pengaturan VARCHAR(50) NOT NULL
);

-- Insert default data

-- Insert default machines
INSERT IGNORE INTO mesin (kode_mesin) VALUES 
('MG-001'),
('MG-002'),
('MG-003');

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO pengguna (nama_pengguna, kata_sandi, nama_lengkap, peran) VALUES 
('admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewcBw4h9kUIp5KBG', 'Administrator', 'admin');

-- Insert default operator (password: operator123)
INSERT IGNORE INTO pengguna (nama_pengguna, kata_sandi, nama_lengkap, peran, id_mesin_ditugaskan) VALUES 
('operator1', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewcBw4h9kUIp5KBG', 'Operator 1', 'operator', 1);

-- Insert default settings
INSERT IGNORE INTO pengaturan (kunci_pengaturan, nilai_pengaturan) VALUES 
('harga_per_kg', '500'),
('konsumsi_bbm_per_kg', '0.1');

-- Create indexes for better performance
CREATE INDEX idx_pesanan_operator ON pesanan(id_operator);
CREATE INDEX idx_pesanan_tanggal ON pesanan(dibuat_pada);
CREATE INDEX idx_pesanan_pelanggan ON pesanan(nama_pelanggan);