// ======================================
// Express Server (Production Pattern)
// Business logic from server.js, coding style from server.deploy.js
// ======================================

 

const fs = require('fs');
const path = require('path');

const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const mysql = require('mysql2/promise');

// Create Express Router (modular, like server.deploy.js)
const app = express.Router();

// ======================================
// Environment & Constants
// ======================================
const JWT_SECRET = process.env.JWT_SECRET || 'pabrik-beras-suryanto-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const UPLOADS_DIR = path.join(__dirname, 'uploads-pabrik-beras');

// Ensure uploads dir exists
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch {}

// ======================================
// Core Middlewares
// ======================================

app.use(cors());
app.use(express.json());

// Advanced static serving with cache headers (pattern from server.deploy.js)
app.use('/uploads-pabrik-beras', express.static(UPLOADS_DIR, {
  setHeaders: (res, filePath) => {
    const lower = String(filePath).toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.gif') || lower.endsWith('.webp')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const ext = lower.split('.').pop();
      res.setHeader('Content-Type', `image/${ext}`);
    }
  },
}));

// ======================================
// Database (Connection Pool)
// ======================================

const pool = mysql.createPool({
    host: 'localhost',
    user: 'isad8273_pabrik-beras-suryanto',
    password: 'isad8273_pabrik-beras-suryanto',
    database: 'isad8273_pabrik-beras-suryanto',
    waitForConnections: true,
    timezone: '+07:00', // Set timezone to Indonesia (UTC+7)
    connectionLimit: 10,
    queueLimit: 0,
  });
// ======================================
// Multer Configuration (disk storage + filter + error handler)
// ======================================

const storage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
    } catch {}
    cb(null, UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const fileExtension = path.extname(file.originalname);
    const fileName = `bukti-${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowedTypes.test(file.mimetype.toLowerCase());
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan (JPG, JPEG, PNG)'));
  }
};

const upload = multer({ storage, fileFilter });

const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Error Upload File', message: 'Ukuran file terlalu besar. Maksimal 5MB.' });
    }
    return res.status(400).json({ error: 'Error Upload File', message: error.message });
  } else if (error) {
    return res.status(400).json({ error: 'Error Upload File', message: error.message });
  }
  next();
};

// ======================================
// Helpers
// ======================================

function deleteUploadedFileByUrl(urlOrPath) {
  try {
    if (!urlOrPath) return;
    const fileName = path.basename(String(urlOrPath));
    if (!fileName || fileName === '/' || fileName === '.' || fileName.includes('..')) return;
    const candidate = path.join(UPLOADS_DIR, fileName);
    if (fs.existsSync(candidate)) {
      fs.unlinkSync(candidate);
    }
  } catch (error) {
    // log and continue
     
    console.error('deleteUploadedFileByUrl error:', error.message);
  }
}

// Robust token verification (pattern from server.deploy.js)
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(403).json({ error: 'Forbidden', message: 'Header Authorization tidak ditemukan' });
    }
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ error: 'Forbidden', message: 'Format token tidak valid. Gunakan: Bearer [token]' });
    }
    const token = authHeader.substring(7);
    if (!token) {
      return res.status(403).json({ error: 'Forbidden', message: 'Token tidak ditemukan' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    // Align with server.js business logic (user payload with peran)
    req.user = {
      id: decoded.id,
      nama_pengguna: decoded.nama_pengguna,
      peran: decoded.peran,
      iat: decoded.iat,
      exp: decoded.exp,
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Token tidak valid' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Token sudah kadaluarsa' });
    } else if (error.name === 'NotBeforeError') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Token belum aktif' });
    }
    return res.status(401).json({ error: 'Unauthorized', message: 'Gagal memverifikasi token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.peran !== 'admin') {
    return res.status(403).json({ message: 'Akses hanya untuk admin' });
  }
  next();
};

// ======================================
// AUTH ROUTES
// ======================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { nama_pengguna, kata_sandi } = req.body || {};

    const [rows] = await pool.execute(
      `SELECT p.*, m.kode_mesin 
       FROM pengguna p 
       LEFT JOIN mesin m ON p.id_mesin_ditugaskan = m.id 
       WHERE p.nama_pengguna = ?`,
      [nama_pengguna]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(kata_sandi, user.kata_sandi);
    if (!validPassword) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        nama_pengguna: user.nama_pengguna,
        peran: user.peran,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ token });
  } catch (error) {
     
    console.error('Login error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.*, m.kode_mesin 
       FROM pengguna p 
       LEFT JOIN mesin m ON p.id_mesin_ditugaskan = m.id 
       WHERE p.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const user = rows[0];
    res.json({
      id: user.id,
      nama_pengguna: user.nama_pengguna,
      nama_lengkap: user.nama_lengkap,
      peran: user.peran,
      id_mesin_ditugaskan: user.id_mesin_ditugaskan,
      kode_mesin: user.kode_mesin,
    });
  } catch (error) {
     
    console.error('Get user detail error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.post('/api/auth/change-password', verifyToken, async (req, res) => {
  try {
    const { kata_sandi_lama, kata_sandi_baru } = req.body || {};
    const userId = req.user.id;

    const [rows] = await pool.execute('SELECT kata_sandi FROM pengguna WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    const validPassword = await bcrypt.compare(kata_sandi_lama, rows[0].kata_sandi);
    if (!validPassword) {
      return res.status(400).json({ message: 'Kata sandi lama tidak benar' });
    }

    const hashedNewPassword = await bcrypt.hash(kata_sandi_baru, 12);
    await pool.execute(
      'UPDATE pengguna SET kata_sandi = ?, diperbarui_pada = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, userId]
    );

    res.json({ message: 'Kata sandi berhasil diubah' });
  } catch (error) {
     
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ======================================
// ORDER ROUTES
// ======================================

// Create order (with multiple photo uploads)
app.post('/api/orders', verifyToken, upload.array('bukti_foto', 10), handleMulterError, async (req, res) => {
  try {
    const {
      nama_pelanggan,
      kontak_pelanggan,
      nama_karnet,
      jumlah_karung,
      berat_gabah_kg,
      lokasi_pengolahan,
      catatan,
      alamat_pengambilan,
    } = req.body || {};

    if (!nama_pelanggan || !jumlah_karung || !berat_gabah_kg || !lokasi_pengolahan || !alamat_pengambilan) {
      return res.status(400).json({
        message: 'Semua field wajib diisi: nama pelanggan, jumlah karung, berat gabah, lokasi pengolahan, dan alamat pengambilan',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Minimal satu bukti foto harus diunggah' });
    }

    // Get user's machine assignment
    const [userRows] = await pool.execute(
      'SELECT id_mesin_ditugaskan FROM pengguna WHERE id = ?',
      [req.user.id]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const id_mesin_ditugaskan = userRows[0].id_mesin_ditugaskan;
    if (!id_mesin_ditugaskan) {
      return res.status(400).json({ message: 'Anda belum ditugaskan ke mesin manapun. Hubungi admin untuk assignment mesin.' });
    }

    const orderParams = [
      nama_pelanggan,
      kontak_pelanggan || null,
      nama_karnet || null,
      parseInt(jumlah_karung, 10) || 0,
      parseFloat(berat_gabah_kg) || 0,
      lokasi_pengolahan,
      catatan || null,
      alamat_pengambilan,
      req.user.id,
      id_mesin_ditugaskan,
    ];

    if (orderParams.some((param) => param === undefined)) {
      return res.status(400).json({ message: 'Data tidak lengkap atau tidak valid' });
    }

    const [result] = await pool.execute(
      `INSERT INTO pesanan (
        nama_pelanggan, kontak_pelanggan, nama_karnet, jumlah_karung, 
        berat_gabah_kg, lokasi_pengolahan, catatan, 
        alamat_pengambilan, id_operator, id_mesin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      orderParams
    );

    const orderId = result.insertId;

    // Insert photo evidence
    for (const file of req.files) {
      const url_bukti_foto = `/uploads-pabrik-beras/${file.filename}`;
      await pool.execute(
        `INSERT INTO bukti_foto (
          id_pesanan, url_bukti_foto, nama_file, ukuran_file, tipe_file
        ) VALUES (?, ?, ?, ?, ?)`,
        [orderId, url_bukti_foto, file.originalname, file.size, file.mimetype]
      );
    }

    res.status(201).json({ id: orderId, message: 'Order berhasil dibuat', uploadedFiles: req.files.length });
  } catch (error) {
     
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// List orders with pagination and search
app.get('/api/orders', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const search = (req.query.search || '').toString();
    const limit = 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        p.*, 
        u.nama_lengkap as nama_operator,
        m.kode_mesin,
        GROUP_CONCAT(bf.url_bukti_foto) as bukti_foto_urls,
        GROUP_CONCAT(bf.nama_file) as bukti_foto_names
      FROM pesanan p
      LEFT JOIN pengguna u ON p.id_operator = u.id
      LEFT JOIN mesin m ON p.id_mesin = m.id
      LEFT JOIN bukti_foto bf ON p.id = bf.id_pesanan
    `;
    const params = [];

    if (req.user.peran === 'operator') {
      query += ' WHERE p.id_operator = ?';
      params.push(req.user.id);
    }

    if (search) {
      const searchCondition = req.user.peran === 'operator' ? ' AND' : ' WHERE';
      query += `${searchCondition} (p.nama_pelanggan LIKE ? OR p.nama_karnet LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY p.id ORDER BY p.dibuat_pada DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);

    let countQuery = 'SELECT COUNT(*) as total FROM pesanan p';
    const countParams = [];

    if (req.user.peran === 'operator') {
      countQuery += ' WHERE p.id_operator = ?';
      countParams.push(req.user.id);
    }
    if (search) {
      const searchCondition = req.user.peran === 'operator' ? ' AND' : ' WHERE';
      countQuery += `${searchCondition} (p.nama_pelanggan LIKE ? OR p.nama_karnet LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      orders: rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
     
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// Get order detail
app.get('/api/orders/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    let query = `
      SELECT 
        p.*, 
        u.nama_lengkap as nama_operator,
        m.kode_mesin
      FROM pesanan p
      LEFT JOIN pengguna u ON p.id_operator = u.id
      LEFT JOIN mesin m ON p.id_mesin = m.id
      WHERE p.id = ?
    `;
    const params = [id];

    if (req.user.peran === 'operator') {
      query += ' AND p.id_operator = ?';
      params.push(req.user.id);
    }

    const [rows] = await pool.execute(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    const [settings] = await pool.execute('SELECT kunci_pengaturan, nilai_pengaturan FROM pengaturan');
    const settingsMap = {};
    for (const s of settings) {
      settingsMap[s.kunci_pengaturan] = parseFloat(s.nilai_pengaturan);
    }

    const order = rows[0];
    const berat = parseFloat(order.berat_gabah_kg) || 0;
    order.estimasi_harga = berat * (settingsMap['harga_per_kg'] || 0);
    order.estimasi_konsumsi_bbm = berat * (settingsMap['konsumsi_bbm_per_kg'] || 0);

    const [photos] = await pool.execute(
      'SELECT * FROM bukti_foto WHERE id_pesanan = ? ORDER BY dibuat_pada ASC',
      [id]
    );
    order.photos = photos;

    res.json(order);
  } catch (error) {
     
    console.error('Get order detail error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// Update order (Admin only)
app.put('/api/orders/:id', verifyToken, requireAdmin, upload.array('new_photos', 10), handleMulterError, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nama_pelanggan,
      kontak_pelanggan,
      nama_karnet,
      jumlah_karung,
      berat_gabah_kg,
      lokasi_pengolahan,
      catatan,
      alamat_pengambilan,
    } = req.body || {};

    const [existingOrder] = await pool.execute('SELECT * FROM pesanan WHERE id = ?', [id]);
    if (existingOrder.length === 0) {
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    const updateQuery = `
      UPDATE pesanan SET 
        nama_pelanggan = ?,
        kontak_pelanggan = ?,
        nama_karnet = ?,
        jumlah_karung = ?,
        berat_gabah_kg = ?,
        lokasi_pengolahan = ?,
        catatan = ?,
        alamat_pengambilan = ?,
        diperbarui_pada = NOW()
      WHERE id = ?
    `;
    await pool.execute(updateQuery, [
      nama_pelanggan,
      kontak_pelanggan || null,
      nama_karnet || null,
      jumlah_karung,
      berat_gabah_kg,
      lokasi_pengolahan || null,
      catatan || null,
      alamat_pengambilan || null,
      id,
    ]);

    if (req.body.photos_to_delete) {
      const photosToDelete = JSON.parse(req.body.photos_to_delete || '[]');
      if (Array.isArray(photosToDelete) && photosToDelete.length > 0) {
        const [photosToDeleteData] = await pool.execute(
          'SELECT url_bukti_foto FROM bukti_foto WHERE id IN (?)',
          [photosToDelete]
        );
        await pool.execute('DELETE FROM bukti_foto WHERE id IN (?)', [photosToDelete]);
        for (const photo of photosToDeleteData) {
          deleteUploadedFileByUrl(photo.url_bukti_foto);
        }
      }
    }

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await pool.execute(
          'INSERT INTO bukti_foto (id_pesanan, url_bukti_foto, nama_file, ukuran_file, tipe_file) VALUES (?, ?, ?, ?, ?)',
          [
            id,
            `/uploads-pabrik-beras/${file.filename}`,
            file.originalname,
            file.size,
            file.mimetype,
          ]
        );
      }
    }

    res.json({ message: 'Order berhasil diperbarui' });
  } catch (error) {
     
    console.error('Update order error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// Delete order (Admin only)
app.delete('/api/orders/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [existingOrder] = await pool.execute('SELECT * FROM pesanan WHERE id = ?', [id]);
    if (existingOrder.length === 0) {
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    const [photos] = await pool.execute('SELECT url_bukti_foto FROM bukti_foto WHERE id_pesanan = ?', [id]);
    await pool.execute('DELETE FROM bukti_foto WHERE id_pesanan = ?', [id]);
    for (const photo of photos) {
      deleteUploadedFileByUrl(photo.url_bukti_foto);
    }

    await pool.execute('DELETE FROM pesanan WHERE id = ?', [id]);
    res.json({ message: 'Order berhasil dihapus' });
  } catch (error) {
     
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ======================================
// USER MANAGEMENT ROUTES (Admin only)
// ======================================

app.get('/api/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const [rows] = await pool.execute(
      `SELECT 
        u.id, u.nama_pengguna, u.nama_lengkap, u.peran, u.id_mesin_ditugaskan,
        m.kode_mesin, u.dibuat_pada
      FROM pengguna u 
      LEFT JOIN mesin m ON u.id_mesin_ditugaskan = m.id
      ORDER BY u.dibuat_pada DESC 
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM pengguna');
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      users: rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
     
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.post('/api/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { nama_pengguna, nama_lengkap, kata_sandi, peran, id_mesin_ditugaskan } = req.body || {};

    const [existing] = await pool.execute('SELECT id FROM pengguna WHERE nama_pengguna = ?', [nama_pengguna]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Username sudah digunakan' });
    }

    const hashedPassword = await bcrypt.hash(kata_sandi, 12);
    await pool.execute(
      `INSERT INTO pengguna (nama_pengguna, kata_sandi, nama_lengkap, peran, id_mesin_ditugaskan) 
       VALUES (?, ?, ?, ?, ?)`,
      [nama_pengguna, hashedPassword, nama_lengkap, peran, id_mesin_ditugaskan || null]
    );

    res.status(201).json({ message: 'Pengguna berhasil dibuat' });
  } catch (error) {
     
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.put('/api/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_pengguna, nama_lengkap, peran, id_mesin_ditugaskan } = req.body || {};

    const [existing] = await pool.execute('SELECT id FROM pengguna WHERE nama_pengguna = ? AND id != ?', [nama_pengguna, id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Username sudah digunakan' });
    }

    await pool.execute(
      `UPDATE pengguna 
       SET nama_pengguna = ?, nama_lengkap = ?, peran = ?, id_mesin_ditugaskan = ?, diperbarui_pada = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [nama_pengguna, nama_lengkap, peran, id_mesin_ditugaskan || null, id]
    );

    res.json({ message: 'Pengguna berhasil diperbarui' });
  } catch (error) {
     
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.delete('/api/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [orders] = await pool.execute('SELECT id FROM pesanan WHERE id_operator = ? LIMIT 1', [id]);
    if (orders.length > 0) {
      return res.status(400).json({ message: 'Tidak dapat menghapus pengguna yang memiliki order' });
    }
    await pool.execute('DELETE FROM pengguna WHERE id = ?', [id]);
    res.json({ message: 'Pengguna berhasil dihapus' });
  } catch (error) {
     
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.post('/api/users/:id/reset-password', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.execute(
      'UPDATE pengguna SET kata_sandi = ?, diperbarui_pada = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id]
    );
    res.json({ message: 'Kata sandi berhasil direset', newPassword });
  } catch (error) {
     
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ======================================
// MACHINE MANAGEMENT ROUTES (Admin only)
// ======================================

app.get('/api/machines', verifyToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const [rows] = await pool.execute(
      'SELECT * FROM mesin ORDER BY dibuat_pada DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM mesin');
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      machines: rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
     
    console.error('Get machines error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.get('/api/machines/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, kode_mesin FROM mesin ORDER BY kode_mesin');
    res.json(rows);
  } catch (error) {
     
    console.error('Get all machines error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.post('/api/machines', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { kode_mesin } = req.body || {};
    const [existing] = await pool.execute('SELECT id FROM mesin WHERE kode_mesin = ?', [kode_mesin]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Kode mesin sudah digunakan' });
    }
    await pool.execute('INSERT INTO mesin (kode_mesin) VALUES (?)', [kode_mesin]);
    res.status(201).json({ message: 'Mesin berhasil dibuat' });
  } catch (error) {
     
    console.error('Create machine error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.put('/api/machines/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { kode_mesin } = req.body || {};
    const [existing] = await pool.execute('SELECT id FROM mesin WHERE kode_mesin = ? AND id != ?', [kode_mesin, id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Kode mesin sudah digunakan' });
    }
    await pool.execute('UPDATE mesin SET kode_mesin = ? WHERE id = ?', [kode_mesin, id]);
    res.json({ message: 'Mesin berhasil diperbarui' });
  } catch (error) {
     
    console.error('Update machine error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.delete('/api/machines/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await pool.execute('SELECT id FROM pengguna WHERE id_mesin_ditugaskan = ? LIMIT 1', [id]);
    const [orders] = await pool.execute('SELECT id FROM pesanan WHERE id_mesin = ? LIMIT 1', [id]);
    if (users.length > 0 || orders.length > 0) {
      return res.status(400).json({ message: 'Tidak dapat menghapus mesin yang masih digunakan' });
    }
    await pool.execute('DELETE FROM mesin WHERE id = ?', [id]);
    res.json({ message: 'Mesin berhasil dihapus' });
  } catch (error) {
     
    console.error('Delete machine error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ======================================
// SETTINGS ROUTES
// ======================================

app.get('/api/settings', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT kunci_pengaturan, nilai_pengaturan FROM pengaturan');
    const settings = {};
    for (const row of rows) {
      settings[row.kunci_pengaturan] = parseFloat(row.nilai_pengaturan);
    }
    res.json(settings);
  } catch (error) {
     
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.put('/api/settings/:key', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { nilai } = req.body || {};
    await pool.execute(
      'INSERT INTO pengaturan (kunci_pengaturan, nilai_pengaturan) VALUES (?, ?) ON DUPLICATE KEY UPDATE nilai_pengaturan = ?',
      [key, nilai, nilai]
    );
    res.json({ message: 'Pengaturan berhasil disimpan' });
  } catch (error) {
     
    console.error('Update setting error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ======================================
// DASHBOARD STATS (Admin only)
// ======================================

app.get('/api/dashboard/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [todayOrders] = await pool.execute('SELECT COUNT(*) as total FROM pesanan WHERE DATE(dibuat_pada) = CURDATE()');
    const [todayWeight] = await pool.execute('SELECT COALESCE(SUM(berat_gabah_kg), 0) as total FROM pesanan WHERE DATE(dibuat_pada) = CURDATE()');
    const [monthOrders] = await pool.execute('SELECT COUNT(*) as total FROM pesanan WHERE MONTH(dibuat_pada) = MONTH(CURDATE()) AND YEAR(dibuat_pada) = YEAR(CURDATE())');
    const [monthWeight] = await pool.execute('SELECT COALESCE(SUM(berat_gabah_kg), 0) as total FROM pesanan WHERE MONTH(dibuat_pada) = MONTH(CURDATE()) AND YEAR(dibuat_pada) = YEAR(CURDATE())');
    const [recentOrders] = await pool.execute(`
      SELECT 
        p.id, p.nama_pelanggan, p.berat_gabah_kg, p.dibuat_pada,
        u.nama_lengkap as nama_operator, m.kode_mesin
      FROM pesanan p
      LEFT JOIN pengguna u ON p.id_operator = u.id
      LEFT JOIN mesin m ON p.id_mesin = m.id
      ORDER BY p.dibuat_pada DESC 
      LIMIT 5
    `);

    res.json({
      todayOrders: todayOrders[0].total,
      todayWeight: todayWeight[0].total,
      monthOrders: monthOrders[0].total,
      monthWeight: monthWeight[0].total,
      recentOrders,
    });
  } catch (error) {
     
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ======================================
// REPORTS ROUTES (Admin only)
// ======================================

app.get('/api/reports', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { type, start_date, end_date, operator_id } = req.query || {};

    let query = `
      SELECT 
        p.*,
        u.nama_lengkap as nama_operator,
        m.kode_mesin
      FROM pesanan p
      LEFT JOIN pengguna u ON p.id_operator = u.id
      LEFT JOIN mesin m ON p.id_mesin = m.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date && end_date) {
      query += ' AND DATE(p.dibuat_pada) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }
    if (operator_id) {
      query += ' AND p.id_operator = ?';
      params.push(operator_id);
    }
    if (type) {
      // placeholder for potential type filters (kept for future parity)
    }

    query += ' ORDER BY p.dibuat_pada DESC';

    const [orders] = await pool.execute(query, params);
    const totalOrders = orders.length;
    const totalWeight = orders.reduce((sum, order) => sum + parseFloat(order.berat_gabah_kg || 0), 0);
    const totalKarung = orders.reduce((sum, order) => sum + parseInt(order.jumlah_karung || 0, 10), 0);

    res.json({
      orders,
      summary: { totalOrders, totalWeight, totalKarung },
    });
  } catch (error) {
     
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// Get operators for reports filter (Admin only)
app.get('/api/operators', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, nama_lengkap FROM pengguna WHERE peran = "operator" ORDER BY nama_lengkap'
    );
    res.json(rows);
  } catch (error) {
     
    console.error('Get operators error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ======================================
// Export Router (to be mounted by a server entrypoint)
// ======================================

module.exports = app;


