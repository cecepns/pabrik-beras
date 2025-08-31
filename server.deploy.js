/* eslint-disable radix */
/* eslint-disable no-empty */
/* eslint-disable no-undef */
// ANCHOR: Express Server Setup for Gemstone Verification App
const fs = require('fs');
const path = require('path');

const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const mysqlLib = require('mysql2');
const mysql = require('mysql2/promise');
const QRCode = require('qrcode');

// Create Express application
const app = express.Router();

// ANCHOR: Uploads Directory Constants
// Centralized absolute paths for uploaded gemstone images (new and legacy)
const UPLOADS_DIR = path.join(__dirname, 'upload-gemstonestory');
const LEGACY_UPLOADS_DIR = path.join(__dirname, 'public/uploads');

// ======================================
// STATIC FILE SERVING MIDDLEWARE
// ======================================

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Specific route for uploads with proper headers
app.use('/uploads', express.static(UPLOADS_DIR, {
  // Set proper cache headers for images
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache
      res.setHeader('Content-Type', `image/${path.split('.').pop()}`);
    }
  },
}));

// Fallback static route to serve legacy files that still reside in the old directory
app.use('/uploads', express.static(LEGACY_UPLOADS_DIR, {
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Type', `image/${path.split('.').pop()}`);
    }
  },
}));

// ======================================
// MULTER CONFIGURATION FOR FILE UPLOAD
// ======================================

// Configure multer for file upload
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadPath = UPLOADS_DIR;
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const fileExtension = path.extname(file.originalname);
    const fileName = `${file.fieldname}-${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  },
});

// ANCHOR: Helper - Delete uploaded file by URL (supports new and legacy dirs)
function deleteUploadedFileByUrl(urlOrPath) {
  try {
    if (!urlOrPath) {
      return;
    }
    const fileName = path.basename(String(urlOrPath));
    if (!fileName || fileName === '/' || fileName === '.' || fileName.includes('..')) {
      return;
    }

    const candidates = [
      path.join(UPLOADS_DIR, fileName),
      path.join(LEGACY_UPLOADS_DIR, fileName),
    ];

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          fs.unlinkSync(candidate);
          // stop after first successful delete
          break;
        }
      } catch (err) {
        // log and continue to try next candidate
        console.error('Error deleting file candidate:', candidate, err.message);
      }
    }
  } catch (error) {
    console.error('deleteUploadedFileByUrl error:', error.message);
  }
}

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
  }
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Error Upload File',
        message: 'Ukuran file terlalu besar. Maksimal 5MB.',
      });
    }
    return res.status(400).json({
      error: 'Error Upload File',
      message: error.message,
    });
  } else if (error) {
    return res.status(400).json({
      error: 'Error Upload File',
      message: error.message,
    });
  }
  next();
};

// ======================================
// JWT CONFIGURATION
// ======================================

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'gemstone_verification_secret_key_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ANCHOR: API Base URL
// Global base URL for API responses and QR code links
const SERVER_BASE_URL = 'https://api-inventory.isavralabel.com/gemstone';
const API_BASE_URL = `${SERVER_BASE_URL}/api`;
const CLIENT_BASE_URL = 'http://gemstonestory.id/';

// Create MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'isad8273_gemstonestory',
  password: 'isad8273_gemstonestory',
  database: 'isad8273_gemstonestory',
  waitForConnections: true,
  timezone: '+07:00', // Set timezone to Indonesia (UTC+7)
  connectionLimit: 10,
  queueLimit: 0,
});

// Test database connection and set timezone
// async function testConnection() {
//   try {
//     const connection = await pool.getConnection();

//     // Set timezone for this connection to Indonesia (UTC+7)
//     await connection.execute("SET time_zone = '+07:00'");

//     console.log('✅ Database connected successfully with timezone set to UTC+7');
//     connection.release();
//   } catch (error) {
//     console.error('❌ Database connection failed:', error.message);
//   }
// }

// Initialize database connection test
// testConnection();

// Set timezone for all new connections in the pool
// pool.on('connection', async (connection) => {
//   try {
//     await connection.execute("SET time_zone = '+07:00'");
//   } catch (error) {
//     console.error('Error setting timezone for connection:', error.message);
//   }
// });

// ======================================
// HELPER FUNCTIONS
// ======================================

/**
 * Generate unique identifiers for gemstone
 * @returns {Object} Object containing unique_id_number and qr_code_data_url
 */
async function generateIdentifiers() {
  try {
    // Generate unique ID with timestamp and random string
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    const unique_id_number = `GEM-${timestamp}-${randomString}`;

    // Create verification URL that will be encoded in QR code
    const verificationUrl = `${CLIENT_BASE_URL}/verify/${unique_id_number}`;

    // Generate QR code as data URL
    const qr_code_data_url = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return {
      unique_id_number,
      qr_code_data_url,
    };
  } catch (error) {
    throw new Error(`Gagal menghasilkan identifier: ${error.message}`);
  }
}

// ======================================
// AUTHENTICATION MIDDLEWARE
// ======================================

/**
 * Middleware to verify JWT token from Authorization header
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyToken = (req, res, next) => {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Header Authorization tidak ditemukan',
      });
    }

    // Check if header format is correct (Bearer [token])
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Format token tidak valid. Gunakan: Bearer [token]',
      });
    }

    // Extract token from header
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if token exists
    if (!token) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Token tidak ditemukan',
      });
    }

    // Verify token using jsonwebtoken
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add decoded payload to req.admin for use in subsequent routes
    req.admin = {
      id: decoded.id,
      username: decoded.username,
      type: decoded.type,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    // Call next() to continue to the next middleware/route
    next();

  } catch (error) {
    // Handle JWT verification errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token tidak valid',
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token sudah kadaluarsa',
      });
    } else if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token belum aktif',
      });
    } else {
      console.error('Token verification error:', error);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Gagal memverifikasi token',
      });
    }
  }
};

// ======================================
// API ROUTES - Add your routes here
// ======================================

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Gemstone verification server is running',
    timestamp: new Date().toISOString(),
  });
});

// ======================================
// GEMSTONE ROUTES
// ======================================

/**
 * POST /api/gemstones - Create new gemstone (Admin only)
 * Handles file upload and stores gemstone data
 */
app.post('/api/gemstones', verifyToken, upload.single('gemstoneImage'), handleMulterError, async(req, res) => {
  try {
    // Extract data from request body
    const {
      name,
      description,
      weight_carat,
      dimensions_mm,
      color,
      treatment,
      origin,
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Nama batu mulia harus diisi',
      });
    }

    // Generate unique identifiers
    const identifiers = await generateIdentifiers();

    // Handle uploaded file
    let photo_url = null;
    if (req.file) {
      // Create public URL for the uploaded file
      photo_url = `/uploads/${req.file.filename}`;
    }

    // Prepare data for database insertion
    const gemstoneData = {
      unique_id_number: identifiers.unique_id_number,
      name: name || null,
      description: description || null,
      weight_carat: weight_carat ? parseFloat(weight_carat) : null,
      dimensions_mm: dimensions_mm || null,
      color: color || null,
      treatment: treatment || null,
      origin: origin || null,
      photo_url,
      qr_code_data_url: identifiers.qr_code_data_url,
    };

    // Insert into database
    const insertQuery = `
      INSERT INTO gemstones (
        unique_id_number, name, description, weight_carat, 
        dimensions_mm, color, treatment, origin, 
        photo_url, qr_code_data_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      gemstoneData.unique_id_number,
      gemstoneData.name,
      gemstoneData.description,
      gemstoneData.weight_carat,
      gemstoneData.dimensions_mm,
      gemstoneData.color,
      gemstoneData.treatment,
      gemstoneData.origin,
      gemstoneData.photo_url,
      gemstoneData.qr_code_data_url,
    ];

    const [result] = await pool.execute(insertQuery, values);

    // Fetch the created gemstone
    const [rows] = await pool.execute(
      'SELECT * FROM gemstones WHERE id = ?',
      [result.insertId],
    );

    const createdGemstone = rows[0];

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Batu mulia berhasil dibuat',
      data: {
        ...createdGemstone,
        photo_url: createdGemstone.photo_url ? `${SERVER_BASE_URL}${createdGemstone.photo_url}` : null,
      },
    });

  } catch (error) {
    console.error('Error creating gemstone:', error);

    // Clean up uploaded file if database insertion fails
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal membuat batu mulia: ${error.message}`,
    });
  }
});

/**
 * GET /api/gemstones/:id - Verify gemstone by unique ID (Public access)
 * Used for QR code verification and public certificate lookup
 */
app.get('/api/gemstones/:id', async(req, res) => {
  try {
    // Extract unique ID from URL parameter
    const { id } = req.params;

    // Validate ID parameter
    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Parameter ID diperlukan',
      });
    }

    // Query database for gemstone by unique_id_number
    const [rows] = await pool.execute(
      'SELECT * FROM gemstones WHERE unique_id_number = ?',
      [id],
    );

    // Check if gemstone was found
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Sertifikat tidak ditemukan',
      });
    }

    // Get the gemstone data
    const gemstone = rows[0];

    // Format response with full photo URL
    const responseData = {
      ...gemstone,
      photo_url: gemstone.photo_url ? `${SERVER_BASE_URL}${gemstone.photo_url}` : null,
      // Add verification status
      verified: true,
      verification_timestamp: new Date().toISOString(),
    };

    // Return gemstone data
    res.status(200).json({
      success: true,
      message: 'Sertifikat ditemukan',
      data: responseData,
    });

  } catch (error) {
    console.error('Error verifying gemstone:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal memverifikasi sertifikat: ${error.message}`,
    });
  }
});

// ======================================
// ADMIN AUTHENTICATION ROUTES
// ======================================

/**
 * POST /api/admin/login - Admin login authentication
 * Handles username/password authentication and returns JWT token
 */
app.post('/api/admin/login', async(req, res) => {
  try {
    // Extract username and password from request body
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Username dan password harus diisi',
      });
    }

    // Search for admin in database by username
    const [rows] = await pool.execute(
      'SELECT * FROM admins WHERE username = ?',
      [username],
    );

    // Check if admin was found
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Admin tidak ditemukan',
      });
    }

    const admin = rows[0];

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Password salah',
      });
    }

    // Create JWT token with admin information
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        type: 'admin',
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'gemstone-verification-system',
        audience: 'admin-panel',
      },
    );

    // Update last login timestamp (optional)
    await pool.execute(
      'UPDATE admins SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [admin.id],
    );

    // Return success response with token
    res.status(200).json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          created_at: admin.created_at,
        },
        expires_in: JWT_EXPIRES_IN,
      },
    });

  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan saat login',
    });
  }
});

/**
 * GET /api/admin/verify - Verify admin token (Protected route example)
 * Uses verifyToken middleware to check authentication
 */
app.get('/api/admin/verify', verifyToken, (req, res) => {
  try {
    // If we reach here, token is valid (thanks to verifyToken middleware)
    res.status(200).json({
      success: true,
      message: 'Token valid',
      data: {
        admin: req.admin,
        authenticated: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Gagal memverifikasi token',
    });
  }
});

/**
 * ANCHOR: Change Admin Password Endpoint
 * POST /api/admin/change-password - Change password for authenticated admin
 */
app.post('/api/admin/change-password', verifyToken, async(req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Sandi saat ini dan sandi baru harus diisi',
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Sandi baru minimal 6 karakter',
      });
    }

    // Get admin by ID from token
    const adminId = req.admin.id;
    const [rows] = await pool.execute('SELECT * FROM admins WHERE id = ?', [adminId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Admin tidak ditemukan' });
    }

    const admin = rows[0];
    const isCurrentValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isCurrentValid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Sandi saat ini salah' });
    }

    // Hash and update new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE admins SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashed, adminId]);

    res.status(200).json({ success: true, message: 'Kata sandi berhasil diubah' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal Server Error', message: `Gagal mengubah kata sandi: ${error.message}` });
  }
});

/**
 * Generate SQL dump for the current database (basic implementation)
 */
async function generateSqlDump() {
  const lines = [];
  lines.push('-- Gemstone Verification System SQL Backup');
  lines.push(`-- Generated at: ${new Date().toISOString()}`);
  lines.push('SET FOREIGN_KEY_CHECKS = 0;');
  lines.push('');

  // Discover tables dynamically
  const [tables] = await pool.query('SHOW TABLES');
  const tableNames = tables.map((row) => Object.values(row)[0]);

  for (const table of tableNames) {
    // DDL
    const [createRows] = await pool.query(`SHOW CREATE TABLE \`${table}\``);
    const createSql = createRows[0]['Create Table'];
    lines.push(`--\n-- Table structure for table \`${table}\`\n--`);
    lines.push(`DROP TABLE IF EXISTS \`${table}\`;`);
    lines.push(`${createSql};`);
    lines.push('');

    // Data
    const [dataRows] = await pool.query(`SELECT * FROM \`${table}\``);
    if (dataRows.length > 0) {
      lines.push(`--\n-- Dumping data for table \`${table}\`\n--`);
      for (const row of dataRows) {
        const columns = Object.keys(row).map((c) => `\`${c}\``).join(', ');
        const values = Object.values(row).map((v) => mysqlLib.escape(v)).join(', ');
        lines.push(`INSERT INTO \`${table}\` (${columns}) VALUES (${values});`);
      }
      lines.push('');
    }
  }

  lines.push('SET FOREIGN_KEY_CHECKS = 1;');
  lines.push('');
  return lines.join('\n');
}

/**
 * ANCHOR: Database Backup Endpoint
 * GET /api/admin/backup - Generates and downloads a SQL backup
 */
app.get('/api/admin/backup', verifyToken, async(req, res) => {
  try {
    const sqlDump = await generateSqlDump();

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .replace(/\..+/, '');
    const filename = `gemstone_backup_${timestamp}.sql`;

    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(sqlDump);
  } catch (error) {
    console.error('Error generating backup:', error);
    res.status(500).json({ error: 'Internal Server Error', message: `Gagal membuat backup: ${error.message}` });
  }
});

/**
 * ANCHOR: Basic Admin Dashboard Stats Endpoint
 * GET /api/admin/stats - Returns basic counts and simple distributions for dashboard
 */
app.get('/api/admin/stats', verifyToken, async(req, res) => {
  try {
    // Totals
    const [totalGemstonesRows] = await pool.execute('SELECT COUNT(*) AS total FROM gemstones');
    const totalGemstones = totalGemstonesRows[0]?.total || 0;

    const [withOwnerRows] = await pool.execute(`
      SELECT COUNT(DISTINCT g.id) AS total
      FROM gemstones g
      JOIN gemstone_owners go ON go.gemstone_id = g.id AND go.is_current_owner = TRUE
    `);
    const gemstonesWithCurrentOwner = withOwnerRows[0]?.total || 0;
    const gemstonesWithoutOwner = Math.max(0, totalGemstones - gemstonesWithCurrentOwner);

    const [totalOwnersRows] = await pool.execute('SELECT COUNT(*) AS total FROM gemstone_owners');
    const totalOwnersRecords = totalOwnersRows[0]?.total || 0;

    const [totalCurrentOwnersRows] = await pool.execute('SELECT COUNT(*) AS total FROM gemstone_owners WHERE is_current_owner = TRUE');
    const totalCurrentOwners = totalCurrentOwnersRows[0]?.total || 0;

    // Distributions (top 5)
    const [colorRows] = await pool.execute(`
      SELECT color AS name, COUNT(*) AS count
      FROM gemstones
      WHERE color IS NOT NULL AND color <> ''
      GROUP BY color
      ORDER BY count DESC
      LIMIT 5
    `);

    const [originRows] = await pool.execute(`
      SELECT origin AS name, COUNT(*) AS count
      FROM gemstones
      WHERE origin IS NOT NULL AND origin <> ''
      GROUP BY origin
      ORDER BY count DESC
      LIMIT 5
    `);

    const [treatmentRows] = await pool.execute(`
      SELECT treatment AS name, COUNT(*) AS count
      FROM gemstones
      WHERE treatment IS NOT NULL AND treatment <> ''
      GROUP BY treatment
      ORDER BY count DESC
      LIMIT 5
    `);

    // Recent (optional basic list)
    const [recentGemstones] = await pool.execute(`
      SELECT id, unique_id_number, name, created_at
      FROM gemstones
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const [recentOwnerships] = await pool.execute(`
      SELECT go.id, g.name AS gemstone_name, go.owner_name, go.is_current_owner, go.created_at
      FROM gemstone_owners go
      LEFT JOIN gemstones g ON g.id = go.gemstone_id
      ORDER BY go.created_at DESC
      LIMIT 5
    `);

    res.status(200).json({
      success: true,
      message: 'Statistik dashboard berhasil diambil',
      data: {
        totals: {
          totalGemstones,
          gemstonesWithCurrentOwner,
          gemstonesWithoutOwner,
          totalOwnersRecords,
          totalCurrentOwners,
        },
        distributions: {
          byColor: colorRows,
          byOrigin: originRows,
          byTreatment: treatmentRows,
        },
        recent: {
          gemstones: recentGemstones,
          ownerships: recentOwnerships,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal mengambil statistik: ${error.message}`,
    });
  }
});

/**
 * GET /api/gemstones - Get all gemstones (Admin only)
 * Returns paginated list of all gemstones with optional filtering
 */
app.get('/api/gemstones', verifyToken, async(req, res) => {
  try {
    // Extract query parameters for pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'desc';

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build WHERE clause for search
    let whereClause = '';
    let whereParams = [];

    if (search) {
      whereClause = `
        WHERE g.name LIKE ? OR 
              g.unique_id_number LIKE ? OR 
              g.color LIKE ? OR 
              g.origin LIKE ? OR 
              g.description LIKE ? OR
              go.owner_name LIKE ?
      `;
      const searchPattern = `%${search}%`;
      whereParams = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
    }

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['id', 'name', 'weight_carat', 'color', 'origin', 'created_at'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Build the main query with current owner information
    const query = `
      SELECT 
        g.id,
        g.unique_id_number,
        g.name,
        g.description,
        g.weight_carat,
        g.dimensions_mm,
        g.color,
        g.treatment,
        g.origin,
        g.photo_url,
        g.qr_code_data_url,
        g.created_at,
        go.owner_name as current_owner_name,
        go.owner_phone as current_owner_phone,
        go.ownership_start_date as current_owner_start_date
      FROM gemstones g
      LEFT JOIN gemstone_owners go ON g.id = go.gemstone_id AND go.is_current_owner = TRUE
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT ? OFFSET ?
    `;

    // Execute query with parameters
    const queryParams = [...whereParams, limit, offset];
    const [rows] = await pool.execute(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM gemstones g
      LEFT JOIN gemstone_owners go ON g.id = go.gemstone_id AND go.is_current_owner = TRUE
      ${whereClause}
    `;
    const [countResult] = await pool.execute(countQuery, whereParams);
    const { total } = countResult[0];

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Format response data with full photo URLs
    const formattedData = rows.map(gemstone => ({
      ...gemstone,
      photo_url: gemstone.photo_url ? `${SERVER_BASE_URL}${gemstone.photo_url}` : null,
    }));

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Batu mulia berhasil diambil',
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        search,
        sortBy: validSortBy,
        sortOrder: validSortOrder,
      },
    });

  } catch (error) {
    console.error('Error fetching gemstones:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal mengambil batu mulia: ${error.message}`,
    });
  }
});

/**
 * GET /api/gemstones/:id/detail - Get single gemstone by ID (Admin only)
 * Returns detailed gemstone information for admin panel
 */
app.get('/api/gemstones/:id/detail', verifyToken, async(req, res) => {
  try {
    // Extract ID from URL parameter
    const { id } = req.params;

    // Validate ID parameter
    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'ID parameter is required',
      });
    }

    // Query database for gemstone by ID
    const [rows] = await pool.execute(
      'SELECT * FROM gemstones WHERE id = ?',
      [id],
    );

    // Check if gemstone was found
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Gemstone not found',
      });
    }

    // Get the gemstone data
    const gemstone = rows[0];

    // Format response with full photo URL
    const responseData = {
      ...gemstone,
      photo_url: gemstone.photo_url ? `${SERVER_BASE_URL}${gemstone.photo_url}` : null,
    };

    // Return gemstone data
    res.status(200).json({
      success: true,
      message: 'Detail batu mulia berhasil diambil',
      data: responseData,
    });

  } catch (error) {
    console.error('Error fetching gemstone detail:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal mengambil detail batu mulia: ${error.message}`,
    });
  }
});

/**
 * DELETE /api/gemstones/:id - Delete gemstone by ID (Admin only)
 * Permanently removes gemstone from database
 */
app.delete('/api/gemstones/:id', verifyToken, async(req, res) => {
  try {
    // Extract ID from URL parameter
    const { id } = req.params;

    // Validate ID parameter
    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'ID parameter is required',
      });
    }

    // First, get the gemstone to check if it exists and get photo URL
    const [existingRows] = await pool.execute(
      'SELECT photo_url FROM gemstones WHERE id = ?',
      [id],
    );

    // Check if gemstone was found
    if (existingRows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Gemstone not found',
      });
    }

    const gemstone = existingRows[0];

    // Delete from database
    const [result] = await pool.execute(
      'DELETE FROM gemstones WHERE id = ?',
      [id],
    );

    // Check if deletion was successful
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Gemstone not found',
      });
    }

    // Delete associated photo file if it exists (supports new and legacy dirs)
    deleteUploadedFileByUrl(gemstone.photo_url);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Batu mulia berhasil dihapus',
    });

  } catch (error) {
    console.error('Error deleting gemstone:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal menghapus batu mulia: ${error.message}`,
    });
  }
});

// ======================================
// GEMSTONE OWNERS API ENDPOINTS
// ======================================

/**
 * GET /api/gemstones/:uniqueId/owners/public - Get gemstone owners history (public)
 */
app.get('/api/gemstones/:uniqueId/owners/public', async(req, res) => {
  try {
    const { uniqueId } = req.params;

    if (!uniqueId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Unique ID parameter is required' });
    }

    // Verify gemstone exists by unique ID
    const [gemstoneRows] = await pool.execute('SELECT id FROM gemstones WHERE unique_id_number = ?', [uniqueId]);
    if (gemstoneRows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Gemstone not found' });
    }

    const gemstoneId = gemstoneRows[0].id;

    // Get owners history (public version - no admin info)
    const [rows] = await pool.execute(`
      SELECT 
        go.owner_name,
        go.owner_phone,
        go.owner_email,
        go.owner_address,
        go.ownership_start_date,
        go.ownership_end_date,
        go.is_current_owner,
        go.notes,
        go.created_at
      FROM gemstone_owners go
      WHERE go.gemstone_id = ?
      ORDER BY go.ownership_start_date DESC, go.created_at DESC
    `, [gemstoneId]);

    res.status(200).json({
      success: true,
      data: rows,
    });

  } catch (error) {
    console.error('Error fetching gemstone owners (public):', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal mengambil riwayat pemilik: ${error.message}`,
    });
  }
});

/**
 * GET /api/gemstones/:id/owners - Get gemstone owners history
 */
app.get('/api/gemstones/:id/owners', verifyToken, async(req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Bad Request', message: 'ID parameter is required' });
    }

    // Verify gemstone exists
    const [gemstoneRows] = await pool.execute('SELECT id FROM gemstones WHERE id = ?', [id]);
    if (gemstoneRows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Gemstone not found' });
    }

    // Get owners history with admin info
    const [rows] = await pool.execute(`
      SELECT 
        go.*,
        a.username as created_by_username
      FROM gemstone_owners go
      LEFT JOIN admins a ON go.created_by = a.id
      WHERE go.gemstone_id = ?
      ORDER BY go.ownership_start_date DESC, go.created_at DESC
    `, [id]);

    res.status(200).json({
      success: true,
      data: rows,
    });

  } catch (error) {
    console.error('Error fetching gemstone owners:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal mengambil riwayat pemilik: ${error.message}`,
    });
  }
});

/**
 * POST /api/gemstones/:id/owners - Add new owner to gemstone
 */
app.post('/api/gemstones/:id/owners', verifyToken, async(req, res) => {
  try {
    const { id } = req.params;
    const {
      owner_name,
      owner_phone,
      owner_email,
      owner_address,
      ownership_start_date,
      ownership_end_date,
      notes,
      is_transfer = false,
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Bad Request', message: 'ID parameter is required' });
    }

    // Validate required fields
    if (!owner_name || !owner_phone || !ownership_start_date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Nama pemilik, nomor telepon, dan tanggal mulai kepemilikan harus diisi',
      });
    }

    // Verify gemstone exists
    const [gemstoneRows] = await pool.execute('SELECT id FROM gemstones WHERE id = ?', [id]);
    if (gemstoneRows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Gemstone not found' });
    }

    // Get admin ID from token
    const adminId = req.admin.id;

    // Check if there's already a current owner
    const [currentOwnerRows] = await pool.execute(`
      SELECT id FROM gemstone_owners 
      WHERE gemstone_id = ? AND is_current_owner = TRUE
    `, [id]);

    const hasCurrentOwner = currentOwnerRows.length > 0;

    // IMPORTANT: Duplicate owner validation has been removed
    // This allows the same person to be recorded multiple times in ownership history
    // For example: John Doe owned the gemstone from 2020-2022, then again from 2024-present
    // This is essential for accurate historical tracking of gemstone ownership

    // Start transaction
    await pool.query('START TRANSACTION');

    try {

      // Handle regular new owner scenario
      if (hasCurrentOwner) {
        if (is_transfer) {
          // Transfer ownership: end current owner's ownership
          await pool.execute(`
            UPDATE gemstone_owners 
            SET ownership_end_date = ?, is_current_owner = FALSE 
            WHERE gemstone_id = ? AND is_current_owner = TRUE
          `, [ownership_start_date, id]);
        } else {
          // Adding new owner without transfer: set new owner as non-current
          // This allows adding historical owners without affecting current owner
          const [result] = await pool.execute(`
            INSERT INTO gemstone_owners (
              gemstone_id, owner_name, owner_phone, owner_email, owner_address,
              ownership_start_date, ownership_end_date, is_current_owner, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            id, owner_name, owner_phone, owner_email, owner_address,
            ownership_start_date, ownership_end_date || null, false, notes, adminId,
          ]);

          // Get the created owner record
          const [newOwnerRows] = await pool.execute(`
            SELECT 
              go.*,
              a.username as created_by_username
            FROM gemstone_owners go
            LEFT JOIN admins a ON go.created_by = a.id
            WHERE go.id = ?
          `, [result.insertId]);

          await pool.query('COMMIT');

          res.status(201).json({
            success: true,
            message: 'Pemilik baru berhasil ditambahkan sebagai mantan pemilik',
            data: newOwnerRows[0],
          });
          return;
        }
      }

      // Insert new owner as current owner (either no current owner exists, or this is a transfer)
      const [result] = await pool.execute(`
        INSERT INTO gemstone_owners (
          gemstone_id, owner_name, owner_phone, owner_email, owner_address,
          ownership_start_date, ownership_end_date, is_current_owner, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, owner_name, owner_phone, owner_email, owner_address,
        ownership_start_date, ownership_end_date || null, true, notes, adminId,
      ]);

      // Commit transaction
      await pool.query('COMMIT');

      // Get the created owner record
      const [newOwnerRows] = await pool.execute(`
        SELECT 
          go.*,
          a.username as created_by_username
        FROM gemstone_owners go
        LEFT JOIN admins a ON go.created_by = a.id
        WHERE go.id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        message: is_transfer ? 'Kepemilikan berhasil ditransfer' : 'Pemilik baru berhasil ditambahkan',
        data: newOwnerRows[0],
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error adding gemstone owner:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal menambahkan pemilik: ${error.message}`,
    });
  }
});

/**
 * POST /api/gemstones/:id/transfer - Transfer ownership
 */
app.post('/api/gemstones/:id/transfer', verifyToken, async(req, res) => {
  try {
    const { id } = req.params;
    const {
      fromOwnerId,
      toOwnerId,
      ownership_start_date,
      ownership_end_date,
      notes,
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Bad Request', message: 'ID parameter is required' });
    }

    // Validate required fields
    if (!fromOwnerId || !toOwnerId || !ownership_start_date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'ID pemilik asal, ID pemilik tujuan, dan tanggal mulai kepemilikan harus diisi',
      });
    }

    // Validate date range if end date is provided
    if (ownership_end_date && ownership_start_date) {
      const startDate = new Date(ownership_start_date);
      const endDate = new Date(ownership_end_date);

      if (endDate <= startDate) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Tanggal berakhir harus setelah tanggal mulai',
        });
      }
    }

    // Verify gemstone exists
    const [gemstoneRows] = await pool.execute('SELECT id FROM gemstones WHERE id = ?', [id]);
    if (gemstoneRows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Gemstone not found' });
    }

    // Verify from owner exists and is current owner
    const [fromOwnerRows] = await pool.execute(`
      SELECT * FROM gemstone_owners 
      WHERE id = ? AND gemstone_id = ? AND is_current_owner = TRUE
    `, [fromOwnerId, id]);

    if (fromOwnerRows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Pemilik asal tidak ditemukan atau bukan pemilik aktif' });
    }

    // Verify to owner exists
    const [toOwnerRows] = await pool.execute(`
      SELECT * FROM gemstone_owners 
      WHERE id = ? AND gemstone_id = ?
    `, [toOwnerId, id]);

    if (toOwnerRows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Pemilik tujuan tidak ditemukan' });
    }

    // Get admin ID from token
    // const adminId = req.admin.id;

    // Start transaction
    await pool.query('START TRANSACTION');

    try {
      // End current owner's ownership
      await pool.execute(`
        UPDATE gemstone_owners 
        SET ownership_end_date = ?, is_current_owner = FALSE 
        WHERE id = ?
      `, [ownership_start_date, fromOwnerId]);

      // Start new owner's ownership
      await pool.execute(`
        UPDATE gemstone_owners 
        SET ownership_start_date = ?, ownership_end_date = ?, is_current_owner = TRUE, notes = ?
        WHERE id = ?
      `, [ownership_start_date, ownership_end_date || null, notes, toOwnerId]);

      // Get the updated records
      const [updatedRows] = await pool.execute(`
        SELECT 
          go.*,
          a.username as created_by_username
        FROM gemstone_owners go
        LEFT JOIN admins a ON go.created_by = a.id
        WHERE go.id = ?
      `, [toOwnerId]);

      await pool.query('COMMIT');

      res.status(200).json({
        success: true,
        message: 'Kepemilikan berhasil ditransfer',
        data: updatedRows[0],
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error transferring ownership:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal mentransfer kepemilikan: ${error.message}`,
    });
  }
});

/**
 * PUT /api/gemstones/:id/owners/:ownerId - Update owner information
 */
app.put('/api/gemstones/:id/owners/:ownerId', verifyToken, async(req, res) => {
  try {
    const { id, ownerId } = req.params;
    const {
      owner_name,
      owner_phone,
      owner_email,
      owner_address,
      ownership_start_date,
      ownership_end_date,
      notes,
    } = req.body;

    if (!id || !ownerId) {
      return res.status(400).json({ error: 'Bad Request', message: 'ID parameter is required' });
    }

    // Validate required fields
    if (!owner_name || !owner_phone || !ownership_start_date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Nama pemilik, nomor telepon, dan tanggal mulai kepemilikan harus diisi',
      });
    }

    // Verify owner exists and belongs to gemstone
    const [ownerRows] = await pool.execute(`
      SELECT * FROM gemstone_owners 
      WHERE id = ? AND gemstone_id = ?
    `, [ownerId, id]);

    if (ownerRows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Owner record not found' });
    }

    // Update owner information
    await pool.execute(`
      UPDATE gemstone_owners SET 
        owner_name = ?,
        owner_phone = ?,
        owner_email = ?,
        owner_address = ?,
        ownership_start_date = ?,
        ownership_end_date = ?,
        notes = ?
      WHERE id = ?
    `, [
      owner_name, owner_phone, owner_email, owner_address,
      ownership_start_date, ownership_end_date, notes, ownerId,
    ]);

    // Get updated record
    const [updatedRows] = await pool.execute(`
      SELECT 
        go.*,
        a.username as created_by_username
      FROM gemstone_owners go
      LEFT JOIN admins a ON go.created_by = a.id
      WHERE go.id = ?
    `, [ownerId]);

    res.status(200).json({
      success: true,
      message: 'Data pemilik berhasil diperbarui',
      data: updatedRows[0],
    });

  } catch (error) {
    console.error('Error updating gemstone owner:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal memperbarui data pemilik: ${error.message}`,
    });
  }
});

/**
 * DELETE /api/gemstones/:id/owners/:ownerId - Delete owner record
 */
app.delete('/api/gemstones/:id/owners/:ownerId', verifyToken, async(req, res) => {
  try {
    const { id, ownerId } = req.params;

    if (!id || !ownerId) {
      return res.status(400).json({ error: 'Bad Request', message: 'ID parameter is required' });
    }

    // Verify owner exists and belongs to gemstone
    const [ownerRows] = await pool.execute(`
      SELECT * FROM gemstone_owners 
      WHERE id = ? AND gemstone_id = ?
    `, [ownerId, id]);

    if (ownerRows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Owner record not found' });
    }

    const owner = ownerRows[0];

    // Prevent deletion of current owner
    if (owner.is_current_owner) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Tidak dapat menghapus pemilik aktif. Transfer kepemilikan terlebih dahulu.',
      });
    }

    // Delete owner record
    await pool.execute('DELETE FROM gemstone_owners WHERE id = ?', [ownerId]);

    res.status(200).json({
      success: true,
      message: 'Data pemilik berhasil dihapus',
    });

  } catch (error) {
    console.error('Error deleting gemstone owner:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal menghapus data pemilik: ${error.message}`,
    });
  }
});

/**
 * GET /api/owners/all - Get all owners from all gemstones (for template selection)
 */
app.get('/api/owners/all', verifyToken, async(req, res) => {
  try {
    // Get all owners with gemstone information for context
    const [ownerRows] = await pool.execute(`
      SELECT 
        go.*,
        g.name as gemstone_name,
        g.unique_id_number as gemstone_unique_id,
        a.username as created_by_username
      FROM gemstone_owners go
      LEFT JOIN gemstones g ON go.gemstone_id = g.id
      LEFT JOIN admins a ON go.created_by = a.id
      ORDER BY go.owner_name ASC, go.created_at DESC
    `);

    res.status(200).json({
      success: true,
      message: 'Data semua pemilik berhasil diambil',
      data: ownerRows,
    });

  } catch (error) {
    console.error('Error fetching all owners:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal mengambil data pemilik: ${error.message}`,
    });
  }
});

// ======================================
// GEMSTONE GALLERY PHOTOS API
// ======================================

// GET /api/gemstones/:id/photos - Get all photos for a gemstone
app.get('/api/gemstones/:id/photos', verifyToken, async(req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(`
      SELECT 
        gp.id,
        gp.photo_url,
        gp.caption,
        gp.created_at,
        a.username as uploaded_by
      FROM gemstone_process_photos gp
      LEFT JOIN admins a ON gp.uploaded_by = a.id
      WHERE gp.gemstone_id = ?
      ORDER BY gp.created_at DESC
    `, [id]);

    const photos = rows.map(photo => ({
      ...photo,
      photo_url: photo.photo_url ? `${SERVER_BASE_URL}${photo.photo_url}` : null,
    }));

    res.json({
      success: true,
      data: photos,
    });
  } catch (error) {
    console.error('Error fetching gemstone photos:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal mengambil foto gemstone: ${error.message}`,
    });
  }
});

// GET /api/gemstones/:id/photos/public - Get all photos for a gemstone (public access)
app.get('/api/gemstones/:id/photos/public', async(req, res) => {
  try {
    const { id } = req.params;

    // First, verify the gemstone exists by unique_id_number
    const [gemstoneRows] = await pool.execute(
      'SELECT id FROM gemstones WHERE unique_id_number = ?',
      [id],
    );

    if (gemstoneRows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Batu mulia tidak ditemukan',
      });
    }

    const gemstoneId = gemstoneRows[0].id;

    // Get photos for the gemstone
    const [rows] = await pool.execute(`
      SELECT 
        gp.id,
        gp.photo_url,
        gp.caption,
        gp.created_at,
        a.username as uploaded_by
      FROM gemstone_process_photos gp
      LEFT JOIN admins a ON gp.uploaded_by = a.id
      WHERE gp.gemstone_id = ?
      ORDER BY gp.created_at DESC
    `, [gemstoneId]);

    const photos = rows.map(photo => ({
      ...photo,
      photo_url: photo.photo_url ? `${SERVER_BASE_URL}${photo.photo_url}` : null,
    }));

    res.json({
      success: true,
      data: photos,
    });
  } catch (error) {
    console.error('Error fetching gemstone photos (public):', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal mengambil foto gemstone: ${error.message}`,
    });
  }
});

// POST /api/gemstones/:id/photos - Upload new photo
app.post('/api/gemstones/:id/photos', verifyToken, upload.single('photo'), async(req, res) => {
  try {
    const { id } = req.params;
    const { caption } = req.body;
    const uploadedBy = req.admin.id;

    // Validate gemstone exists
    const [gemstoneRows] = await pool.execute('SELECT id FROM gemstones WHERE id = ?', [id]);
    if (gemstoneRows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Batu mulia tidak ditemukan',
      });
    }

    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Foto harus diupload',
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Format file tidak didukung. Gunakan JPG, PNG, atau WebP',
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Ukuran file terlalu besar. Maksimal 5MB',
      });
    }

    const photoUrl = `/uploads/${req.file.filename}`;

    // Insert photo record
    const [result] = await pool.execute(`
      INSERT INTO gemstone_process_photos (gemstone_id, photo_url, caption, uploaded_by)
      VALUES (?, ?, ?, ?)
    `, [id, photoUrl, caption || null, uploadedBy]);

    // Get the inserted photo
    const [photoRows] = await pool.execute(`
      SELECT 
        gp.id,
        gp.photo_url,
        gp.caption,
        gp.created_at,
        a.username as uploaded_by
      FROM gemstone_process_photos gp
      LEFT JOIN admins a ON gp.uploaded_by = a.id
      WHERE gp.id = ?
    `, [result.insertId]);

    const photo = {
      ...photoRows[0],
      photo_url: photoRows[0].photo_url ? `${SERVER_BASE_URL}${photoRows[0].photo_url}` : null,
    };

    res.status(201).json({
      success: true,
      message: 'Foto berhasil diupload',
      data: photo,
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    // Cleanup uploaded file if database operation failed
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal upload foto: ${error.message}`,
    });
  }
});

// PUT /api/gemstones/:id/photos/:photoId - Update photo caption
app.put('/api/gemstones/:id/photos/:photoId', verifyToken, async(req, res) => {
  try {
    const { id, photoId } = req.params;
    const { caption } = req.body;

    // Validate photo exists and belongs to gemstone
    const [photoRows] = await pool.execute(`
      SELECT id FROM gemstone_process_photos 
      WHERE id = ? AND gemstone_id = ?
    `, [photoId, id]);

    if (photoRows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Foto tidak ditemukan',
      });
    }

    // Update caption
    await pool.execute(`
      UPDATE gemstone_process_photos 
      SET caption = ? 
      WHERE id = ?
    `, [caption || null, photoId]);

    // Get updated photo
    const [updatedRows] = await pool.execute(`
      SELECT 
        gp.id,
        gp.photo_url,
        gp.caption,
        gp.created_at,
        a.username as uploaded_by
      FROM gemstone_process_photos gp
      LEFT JOIN admins a ON gp.uploaded_by = a.id
      WHERE gp.id = ?
    `, [photoId]);

    const photo = {
      ...updatedRows[0],
      photo_url: updatedRows[0].photo_url ? `${SERVER_BASE_URL}${updatedRows[0].photo_url}` : null,
    };

    res.json({
      success: true,
      message: 'Caption foto berhasil diperbarui',
      data: photo,
    });
  } catch (error) {
    console.error('Error updating photo caption:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal memperbarui caption foto: ${error.message}`,
    });
  }
});

// DELETE /api/gemstones/:id/photos/:photoId - Delete photo
app.delete('/api/gemstones/:id/photos/:photoId', verifyToken, async(req, res) => {
  try {
    const { id, photoId } = req.params;

    // Get photo details before deletion
    const [photoRows] = await pool.execute(`
      SELECT photo_url FROM gemstone_process_photos 
      WHERE id = ? AND gemstone_id = ?
    `, [photoId, id]);

    if (photoRows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Foto tidak ditemukan',
      });
    }

    const photoUrl = photoRows[0].photo_url;

    // Delete from database
    await pool.execute(`
      DELETE FROM gemstone_process_photos 
      WHERE id = ?
    `, [photoId]);

    // Delete file from filesystem
    if (photoUrl) {
      deleteUploadedFileByUrl(photoUrl);
    }

    res.json({
      success: true,
      message: 'Foto berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Gagal menghapus foto: ${error.message}`,
    });
  }
});

// TODO: Add more protected routes here
// app.post('/api/gemstones', verifyToken, createGemstone); // Already has verifyToken
// app.put('/api/gemstones/:id', verifyToken, updateGemstone);

/**
 * PUT /api/gemstones/:id - Update gemstone by ID (Admin only)
 * Allows updating text fields and optionally replacing the photo
 */
app.put('/api/gemstones/:id', verifyToken, upload.single('gemstoneImage'), handleMulterError, async(req, res) => {
  try {
    const { id } = req.params;
    const { name, description, weight_carat, dimensions_mm, color, treatment, origin } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Bad Request', message: 'ID parameter is required' });
    }

    // Get existing gemstone to verify and get current photo path
    const [existingRows] = await pool.execute('SELECT * FROM gemstones WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Gemstone not found' });
    }
    const existing = existingRows[0];

    // Prepare update fields
    const fields = {
      name: name ?? existing.name,
      description: description ?? existing.description,
      weight_carat: weight_carat !== undefined && weight_carat !== null && weight_carat !== '' ? parseFloat(weight_carat) : existing.weight_carat,
      dimensions_mm: dimensions_mm ?? existing.dimensions_mm,
      color: color ?? existing.color,
      treatment: treatment ?? existing.treatment,
      origin: origin ?? existing.origin,
      photo_url: existing.photo_url,
    };

    // If new file uploaded, set new photo_url and delete old file
    if (req.file) {
      const newPhotoPath = `/uploads/${req.file.filename}`;
      // delete old file if exists
      if (existing.photo_url) {
        deleteUploadedFileByUrl(existing.photo_url);
      }
      fields.photo_url = newPhotoPath;
    }

    const updateQuery = `
      UPDATE gemstones SET 
        name = ?,
        description = ?,
        weight_carat = ?,
        dimensions_mm = ?,
        color = ?,
        treatment = ?,
        origin = ?,
        photo_url = ?
      WHERE id = ?
    `;

    const values = [
      fields.name,
      fields.description,
      fields.weight_carat,
      fields.dimensions_mm,
      fields.color,
      fields.treatment,
      fields.origin,
      fields.photo_url,
      id,
    ];

    await pool.execute(updateQuery, values);

    // Return updated record
    const [rows] = await pool.execute('SELECT * FROM gemstones WHERE id = ?', [id]);
    const updated = rows[0];
    res.status(200).json({
      success: true,
      message: 'Batu mulia berhasil diperbarui',
      data: {
        ...updated,
        photo_url: updated.photo_url ? `${SERVER_BASE_URL}${updated.photo_url}` : null,
      },
    });
  } catch (error) {
    console.error('Error updating gemstone:', error);
    // If upload succeeded but update failed, cleanup new file
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }
    res.status(500).json({ error: 'Internal Server Error', message: `Gagal memperbarui batu mulia: ${error.message}` });
  }
});

// Export app for testing purposes
module.exports = app;
