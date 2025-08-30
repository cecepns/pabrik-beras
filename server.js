import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 5000;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Database connection
const dbConfig = {
  host: 'localhost',
  user: 'root', 
  password: '',
  database: 'pabrik_beras'
}

let db;

async function initDB() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bukti-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diizinkan (JPG, JPEG, PNG)'));
    }
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token akses diperlukan' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token tidak valid' });
    req.user = user;
    next();
  });
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
  if (req.user.peran !== 'admin') {
    return res.status(403).json({ message: 'Akses hanya untuk admin' });
  }
  next();
};

// AUTH ROUTES
app.post('/api/auth/login', async (req, res) => {
  try {
    const { nama_pengguna, kata_sandi } = req.body;

    const [rows] = await db.execute(
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
    console.log(user.kata_sandi, kata_sandi);
    const validPassword = await bcrypt.compare(kata_sandi, user.kata_sandi);

    if (!validPassword) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        nama_pengguna: user.nama_pengguna, 
        peran: user.peran
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
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
      kode_mesin: user.kode_mesin
    });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { kata_sandi_lama, kata_sandi_baru } = req.body;
    const userId = req.user.id;

    // Get current user
    const [rows] = await db.execute('SELECT kata_sandi FROM pengguna WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    // Verify old password
    const validPassword = await bcrypt.compare(kata_sandi_lama, rows[0].kata_sandi);
    if (!validPassword) {
      return res.status(400).json({ message: 'Kata sandi lama tidak benar' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(kata_sandi_baru, 12);

    // Update password
    await db.execute(
      'UPDATE pengguna SET kata_sandi = ?, diperbarui_pada = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, userId]
    );

    res.json({ message: 'Kata sandi berhasil diubah' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ORDER ROUTES
app.post('/api/orders', authenticateToken, upload.single('bukti_foto'), async (req, res) => {
  try {
    const {
      nama_pelanggan,
      kontak_pelanggan,
      nama_karnet,
      jumlah_karung,
      berat_gabah_kg,
      lokasi_pengolahan,
      catatan,
      alamat_pengambilan
    } = req.body;

    // Validate required fields
    if (!nama_pelanggan || !jumlah_karung || !berat_gabah_kg || !lokasi_pengolahan || !alamat_pengambilan) {
      return res.status(400).json({ 
        message: 'Semua field wajib diisi: nama pelanggan, jumlah karung, berat gabah, lokasi pengolahan, dan alamat pengambilan' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Bukti foto harus diunggah' });
    }

    // Get user's machine assignment
    const [userRows] = await db.execute(
      'SELECT id_mesin_ditugaskan FROM pengguna WHERE id = ?',
      [req.user.id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const id_mesin_ditugaskan = userRows[0].id_mesin_ditugaskan;

    // Validate machine assignment
    if (!id_mesin_ditugaskan) {
      return res.status(400).json({ message: 'Anda belum ditugaskan ke mesin manapun. Hubungi admin untuk assignment mesin.' });
    }

    const url_bukti_foto = `/uploads/${req.file.filename}`;

    // Prepare parameters with proper validation
    const params = [
      nama_pelanggan,
      kontak_pelanggan || null,
      nama_karnet || null,
      parseInt(jumlah_karung) || 0,
      parseFloat(berat_gabah_kg) || 0,
      url_bukti_foto,
      lokasi_pengolahan,
      catatan || null,
      alamat_pengambilan,
      req.user.id,
      id_mesin_ditugaskan
    ];

    // Check for undefined values
    if (params.some(param => param === undefined)) {
      return res.status(400).json({ message: 'Data tidak lengkap atau tidak valid' });
    }

    const [result] = await db.execute(
      `INSERT INTO pesanan (
        nama_pelanggan, kontak_pelanggan, nama_karnet, jumlah_karung, 
        berat_gabah_kg, url_bukti_foto, lokasi_pengolahan, catatan, 
        alamat_pengambilan, id_operator, id_mesin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params
    );

    res.status(201).json({ 
      id: result.insertId,
      message: 'Order berhasil dibuat' 
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { page = 1, search = '' } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        p.*, 
        u.nama_lengkap as nama_operator,
        m.kode_mesin
      FROM pesanan p
      LEFT JOIN pengguna u ON p.id_operator = u.id
      LEFT JOIN mesin m ON p.id_mesin = m.id
    `;
    
    let params = [];

    // Filter by role
    if (req.user.peran === 'operator') {
      query += ' WHERE p.id_operator = ?';
      params.push(req.user.id);
    }

    // Add search filter
    if (search) {
      const searchCondition = req.user.peran === 'operator' ? ' AND' : ' WHERE';
      query += `${searchCondition} (p.nama_pelanggan LIKE ? OR p.nama_karnet LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.dibuat_pada DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM pesanan p';
    let countParams = [];

    if (req.user.peran === 'operator') {
      countQuery += ' WHERE p.id_operator = ?';
      countParams.push(req.user.id);
    }

    if (search) {
      const searchCondition = req.user.peran === 'operator' ? ' AND' : ' WHERE';
      countQuery += `${searchCondition} (p.nama_pelanggan LIKE ? OR p.nama_karnet LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const [countResult] = await db.execute(countQuery, countParams);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      orders: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
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
    
    let params = [id];

    // Operator can only see their own orders
    if (req.user.peran === 'operator') {
      query += ' AND p.id_operator = ?';
      params.push(req.user.id);
    }

    const [rows] = await db.execute(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    // Get settings for calculations
    const [settings] = await db.execute('SELECT kunci_pengaturan, nilai_pengaturan FROM pengaturan');
    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.kunci_pengaturan] = parseFloat(setting.nilai_pengaturan);
    });

    const order = rows[0];
    order.estimasi_harga = order.berat_gabah_kg * (settingsMap['harga_per_kg'] || 0);
    order.estimasi_konsumsi_bbm = order.berat_gabah_kg * (settingsMap['konsumsi_bbm_per_kg'] || 0);

    res.json(order);
  } catch (error) {
    console.error('Get order detail error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// USER MANAGEMENT ROUTES (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;

    const [rows] = await db.execute(
      `SELECT 
        u.id, u.nama_pengguna, u.nama_lengkap, u.peran, u.id_mesin_ditugaskan,
        m.kode_mesin, u.dibuat_pada
      FROM pengguna u 
      LEFT JOIN mesin m ON u.id_mesin_ditugaskan = m.id
      ORDER BY u.dibuat_pada DESC 
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM pengguna');
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      users: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { nama_pengguna, nama_lengkap, kata_sandi, peran, id_mesin_ditugaskan } = req.body;

    // Check if username already exists
    const [existing] = await db.execute('SELECT id FROM pengguna WHERE nama_pengguna = ?', [nama_pengguna]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Username sudah digunakan' });
    }

    const hashedPassword = await bcrypt.hash(kata_sandi, 12);

    await db.execute(
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

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_pengguna, nama_lengkap, peran, id_mesin_ditugaskan } = req.body;

    // Check if username already exists for other users
    const [existing] = await db.execute('SELECT id FROM pengguna WHERE nama_pengguna = ? AND id != ?', [nama_pengguna, id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Username sudah digunakan' });
    }

    await db.execute(
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

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has orders
    const [orders] = await db.execute('SELECT id FROM pesanan WHERE id_operator = ? LIMIT 1', [id]);
    if (orders.length > 0) {
      return res.status(400).json({ message: 'Tidak dapat menghapus pengguna yang memiliki order' });
    }

    await db.execute('DELETE FROM pengguna WHERE id = ?', [id]);
    res.json({ message: 'Pengguna berhasil dihapus' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.post('/api/users/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Generate random password
    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.execute(
      'UPDATE pengguna SET kata_sandi = ?, diperbarui_pada = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id]
    );

    res.json({ 
      message: 'Kata sandi berhasil direset',
      newPassword: newPassword
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// MACHINE MANAGEMENT ROUTES (Admin only)
app.get('/api/machines', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;

    const [rows] = await db.execute(
      'SELECT * FROM mesin ORDER BY dibuat_pada DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM mesin');
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      machines: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get machines error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.get('/api/machines/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, kode_mesin FROM mesin ORDER BY kode_mesin');
    res.json(rows);
  } catch (error) {
    console.error('Get all machines error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.post('/api/machines', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { kode_mesin } = req.body;

    // Check if machine code already exists
    const [existing] = await db.execute('SELECT id FROM mesin WHERE kode_mesin = ?', [kode_mesin]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Kode mesin sudah digunakan' });
    }

    await db.execute('INSERT INTO mesin (kode_mesin) VALUES (?)', [kode_mesin]);
    res.status(201).json({ message: 'Mesin berhasil dibuat' });
  } catch (error) {
    console.error('Create machine error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.put('/api/machines/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { kode_mesin } = req.body;

    // Check if machine code already exists for other machines
    const [existing] = await db.execute('SELECT id FROM mesin WHERE kode_mesin = ? AND id != ?', [kode_mesin, id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Kode mesin sudah digunakan' });
    }

    await db.execute('UPDATE mesin SET kode_mesin = ? WHERE id = ?', [kode_mesin, id]);
    res.json({ message: 'Mesin berhasil diperbarui' });
  } catch (error) {
    console.error('Update machine error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

app.delete('/api/machines/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if machine is assigned to any user or has orders
    const [users] = await db.execute('SELECT id FROM pengguna WHERE id_mesin_ditugaskan = ? LIMIT 1', [id]);
    const [orders] = await db.execute('SELECT id FROM pesanan WHERE id_mesin = ? LIMIT 1', [id]);
    
    if (users.length > 0 || orders.length > 0) {
      return res.status(400).json({ message: 'Tidak dapat menghapus mesin yang masih digunakan' });
    }

    await db.execute('DELETE FROM mesin WHERE id = ?', [id]);
    res.json({ message: 'Mesin berhasil dihapus' });
  } catch (error) {
    console.error('Delete machine error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// SETTINGS ROUTES
// Get settings (accessible by all authenticated users for calculations)
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT kunci_pengaturan, nilai_pengaturan FROM pengaturan');
    const settings = {};
    rows.forEach(row => {
      settings[row.kunci_pengaturan] = parseFloat(row.nilai_pengaturan);
    });
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// Update settings (Admin only)
app.put('/api/settings/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { nilai } = req.body;

    await db.execute(
      'INSERT INTO pengaturan (kunci_pengaturan, nilai_pengaturan) VALUES (?, ?) ON DUPLICATE KEY UPDATE nilai_pengaturan = ?',
      [key, nilai, nilai]
    );

    res.json({ message: 'Pengaturan berhasil disimpan' });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// DASHBOARD STATS (Admin only)
app.get('/api/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Today's orders
    const [todayOrders] = await db.execute(
      'SELECT COUNT(*) as total FROM pesanan WHERE DATE(dibuat_pada) = CURDATE()'
    );

    // Today's total weight
    const [todayWeight] = await db.execute(
      'SELECT COALESCE(SUM(berat_gabah_kg), 0) as total FROM pesanan WHERE DATE(dibuat_pada) = CURDATE()'
    );

    // This month's orders
    const [monthOrders] = await db.execute(
      'SELECT COUNT(*) as total FROM pesanan WHERE MONTH(dibuat_pada) = MONTH(CURDATE()) AND YEAR(dibuat_pada) = YEAR(CURDATE())'
    );

    // This month's total weight
    const [monthWeight] = await db.execute(
      'SELECT COALESCE(SUM(berat_gabah_kg), 0) as total FROM pesanan WHERE MONTH(dibuat_pada) = MONTH(CURDATE()) AND YEAR(dibuat_pada) = YEAR(CURDATE())'
    );

    // Recent orders
    const [recentOrders] = await db.execute(
      `SELECT 
        p.id, p.nama_pelanggan, p.berat_gabah_kg, p.dibuat_pada,
        u.nama_lengkap as nama_operator, m.kode_mesin
      FROM pesanan p
      LEFT JOIN pengguna u ON p.id_operator = u.id
      LEFT JOIN mesin m ON p.id_mesin = m.id
      ORDER BY p.dibuat_pada DESC 
      LIMIT 5`
    );

    res.json({
      todayOrders: todayOrders[0].total,
      todayWeight: todayWeight[0].total,
      monthOrders: monthOrders[0].total,
      monthWeight: monthWeight[0].total,
      recentOrders
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// REPORTS ROUTES (Admin only)
app.get('/api/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, start_date, end_date, operator_id } = req.query;

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
    let params = [];

    // Date filter
    if (start_date && end_date) {
      query += ' AND DATE(p.dibuat_pada) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    // Operator filter
    if (operator_id) {
      query += ' AND p.id_operator = ?';
      params.push(operator_id);
    }

    query += ' ORDER BY p.dibuat_pada DESC';

    const [orders] = await db.execute(query, params);

    // Calculate summary
    const totalOrders = orders.length;
    const totalWeight = orders.reduce((sum, order) => sum + parseFloat(order.berat_gabah_kg), 0);
    const totalKarung = orders.reduce((sum, order) => sum + parseInt(order.jumlah_karung), 0);

    res.json({
      orders,
      summary: {
        totalOrders,
        totalWeight,
        totalKarung
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// Get operators for reports filter
app.get('/api/operators', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, nama_lengkap FROM pengguna WHERE peran = "operator" ORDER BY nama_lengkap'
    );
    res.json(rows);
  } catch (error) {
    console.error('Get operators error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// Create uploads directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Initialize database connection
initDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});