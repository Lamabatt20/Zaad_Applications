const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();
const vision = require("@google-cloud/vision");
const dayjs = require("dayjs");


const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log('➡', req.method, req.url);
  next();
});

app.get('/__ping', (req, res) => res.send('pong'));

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function ensureAddressColumn() {
  try {
    const alterQuery = `
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS address VARCHAR(255);
    `;
    await pool.query(alterQuery);
    console.log('✅ Address column verified/added successfully in accounts table.');
  } catch (error) {
    console.error('❌ Error adding address column:', error);
  }
}



ensureAddressColumn();
async function ensureAssociationColumns() {
  try {
    const alterQuery = `
      ALTER TABLE associations
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS food BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS clothes BOOLEAN DEFAULT FALSE;
    `;
    await pool.query(alterQuery);
    console.log('✅ Association columns verified/added successfully.');
  } catch (error) {
    console.error('❌ Error adding association columns:', error);
  }
}

ensureAssociationColumns();
async function changeAssociationAuthToText() {
  try {
    const alterQuery = `
      ALTER TABLE associations
      ALTER COLUMN association_authentication
      TYPE TEXT
      USING association_authentication::TEXT;
    `;
    await pool.query(alterQuery);
    console.log('✅ association_authentication column changed from JSONB to TEXT successfully.');
  } catch (error) {
    console.error('❌ Error changing column type:', error);
  }
}

changeAssociationAuthToText();

async function dropIsPerishableColumn() {
  try {
    const alterQuery = `
      ALTER TABLE food_donations
      DROP COLUMN IF EXISTS is_perishable;
    `;
    await pool.query(alterQuery);
    console.log('✅ is_perishable column dropped from food_donations (if it existed).');
  } catch (error) {
    console.error('❌ Error dropping is_perishable column:', error);
  }
}

async function ensureDonationAddressColumn() {
  try {
    const alterQuery = `
      ALTER TABLE donations
      ADD COLUMN IF NOT EXISTS address VARCHAR(255);
    `;
    await pool.query(alterQuery);
    console.log('✅ Address column verified/added successfully in donations table.');
  } catch (error) {
    console.error('❌ Error adding address column to donations:', error);
  }
}

dropIsPerishableColumn();
ensureDonationAddressColumn();

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });
const visionClient = new vision.ImageAnnotatorClient();


app.get('/accounts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM accounts');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Return a single account by id
app.get('/accounts/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM accounts WHERE account_id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Account not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching account by id:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
app.post('/accounts', async (req, res) => {
  const { username, password, role, email, phone, full_name, address } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO accounts (username, password_hash, role, email, phone, full_name, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [username, hashedPassword, role, email, phone, full_name, address]
    );

    res.json({
      success: true,
      account: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



app.put('/accounts/user/:account_id', async (req, res) => {
  const accountId = req.params.account_id;
  const { username, email, phone, full_name, address, password } = req.body;

  try {
    let updateFields = [];
    let values = [];
    let index = 1;

    if (username !== undefined) {
      updateFields.push(`username = $${index++}`);
      values.push(username);
    }

    if (email !== undefined) {
      updateFields.push(`email = $${index++}`);
      values.push(email);
    }

    if (phone !== undefined) {
      updateFields.push(`phone = $${index++}`);
      values.push(phone);
    }

    if (full_name !== undefined) {
      updateFields.push(`full_name = $${index++}`);
      values.push(full_name);
    }

    if (address !== undefined) {
      updateFields.push(`address = $${index++}`);
      values.push(address);
    }

    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push(`password_hash = $${index++}`);
      values.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    values.push(accountId);

    const updateQuery = `
      UPDATE accounts
      SET ${updateFields.join(', ')}
      WHERE account_id = $${index}
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.json({
      success: true,
      message: "Account updated successfully",
      account: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM accounts WHERE username = $1',
      [username]
    );

    let usernameIncorrect = false;
    let passwordIncorrect = false;

    if (result.rows.length === 0) {
      usernameIncorrect = true;
    }

    const user = result.rows[0];

    if (!usernameIncorrect) {
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) passwordIncorrect = true;
    }

    if (usernameIncorrect || passwordIncorrect) {
      return res.json({
        success: false,
        usernameIncorrect,
        passwordIncorrect,
      });
    }

    
    let responseData = {
      success: true,
      role: user.role,
      user_id: user.account_id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      address: user.address,
      phone: user.phone,
    };

    
    if (user.role === 'association') {
      const assocResult = await pool.query(
        'SELECT food, clothes FROM associations WHERE user_id = $1',
        [user.account_id]
      );

      if (assocResult.rows.length > 0) {
        responseData.food = assocResult.rows[0].food;
        responseData.clothes = assocResult.rows[0].clothes;
      } else {
        responseData.food = false;
        responseData.clothes = false;
      }
    }

    res.json(responseData);

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/reset-password', async (req, res) => {
  const { usernameOrEmail, newPassword } = req.body;

  if (!usernameOrEmail || !newPassword) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM accounts WHERE username = $1 OR email = $1`,
      [usernameOrEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const user = result.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE accounts SET password_hash = $1 WHERE account_id = $2`,
      [hashedPassword, user.account_id]
    );

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/users', async (req, res) => {
  const { account_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (account_id) VALUES ($1) RETURNING *',
      [account_id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/admins', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM admins');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/admins', async (req, res) => {
  const { user_id, privileges } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO admins (user_id, privileges) VALUES ($1,$2) RETURNING *',
      [user_id, privileges || {}]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.get('/donors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM donors');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/donors', async (req, res) => {
  const { user_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO donors (user_id) VALUES ($1) RETURNING *',
      [user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.get('/associations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM associations');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/associations', upload.fields([
  { name: 'association_logo', maxCount: 1 },
  { name: 'association_authentication', maxCount: 1 }
]), async (req, res) => {
  const { user_id, name, description, food, clothes } = req.body;
  try {
    const logoFile = req.files['association_logo'] ? req.files['association_logo'][0].filename : null;
    const authFile = req.files['association_authentication'] ? req.files['association_authentication'][0].filename : null;

    const logoPath = logoFile ? `/uploads/${logoFile}` : null;
    const authPath = authFile ? `/uploads/${authFile}` : null;

    const result = await pool.query(
      `INSERT INTO associations 
        (user_id, name, association_authentication, association_logo, description, food, clothes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user_id, name, authPath, logoPath, description, food === 'true', clothes === 'true']
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});



app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get('/donations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM donations');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/donations', upload.single("item_image"), async (req, res) => {
  const { donor_id, donation_type, note, status, address, association_id, latitude, longitude } = req.body;
  const file = req.file;
  try {
    const imagePath = file ? `/uploads/${file.filename}` : null;

    // Try to insert with the new address/association/coords columns (if migration applied)
    try {
      const result = await pool.query(
        `INSERT INTO donations (donor_id, donation_type, item_image, note, status, address, association_id, latitude, longitude)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [donor_id, donation_type, imagePath, note, status || 'pending', address || null, association_id || null, latitude || null, longitude || null]
      );
      return res.json(result.rows[0]);
    } catch (errInsert) {
      // Fallback: the DB might not have the new columns yet — try original insert
      console.warn('Extended donations insert failed, falling back to original insert:', errInsert.message);
      const result = await pool.query(
        `INSERT INTO donations (donor_id, donation_type, item_image, note, status)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [donor_id, donation_type, imagePath, note, status || 'pending']
      );
      return res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('DONATIONS ERROR:', err);
    res.status(500).send('Server error');
  }
});

app.post('/food_donations', async (req, res) => {
  const { donation_id, food_type, expiration_date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO food_donations (donation_id, food_type, expiration_date)
       VALUES ($1,$2,$3) RETURNING *`,
      [donation_id, food_type, expiration_date]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('FOOD_DONATIONS ERROR:', err);
    res.status(500).send('Server error');
  }
});

app.post('/clothes_donations', async (req, res) => {
  const { donation_id, clothes_type } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO clothes_donations (donation_id, clothes_type)
       VALUES ($1,$2) RETURNING *`,
      [donation_id, clothes_type]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.get('/donation_history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM donation_history');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/donation_history', async (req, res) => {
  const { donation_id, donor_id, quantity, description, event_time } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO donation_history (donation_id, donor_id, quantity, description, event_time)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [donation_id, donor_id, quantity, description, event_time || new Date()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.get('/delivery_persons', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM delivery_persons');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/delivery_persons', async (req, res) => {
  const { association_id, name, phone_number, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO delivery_persons (association_id, name, phone_number, status)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [association_id, name, phone_number, status]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.get('/delivery', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM donation_deliveries');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/delivery', async (req, res) => {
  const { delivery_person_id, donation_id, delivery_status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO donation_deliveries (delivery_person_id, donation_id, delivery_status)
       VALUES ($1,$2,$3) RETURNING *`,
      [delivery_person_id, donation_id, delivery_status || 'pending']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.get('/feedbacks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM feedbacks');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/feedbacks', async (req, res) => {
  const { donor_id, association_id, donor_name, message, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO feedbacks (donor_id, association_id, donor_name, message, status)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [donor_id, association_id, donor_name, message, status]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.get('/notifications', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/notifications', async (req, res) => {
  const { user_id, type, message, is_read } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, message, is_read)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [user_id, type, message, is_read || false]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Server error');
  }
});
app.get("/recommend", async (req, res) => {
  const { donation_type, donor_id, location } = req.query;

  try {
    let query = `
      SELECT 
        a.association_id,
        a.name,
        a.description,
        acc.address
      FROM associations a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN accounts acc ON acc.account_id = u.account_id
      WHERE 1 = 1
    `;

    if (donation_type === "food") query += " AND a.food = true";
    if (donation_type === "clothes") query += " AND a.clothes = true";

    const result = await pool.query(query);
    let associations = result.rows;

    if (location) {
      const loc = location.toLowerCase();
      associations = associations.filter(a =>
        a.address?.toLowerCase().includes(loc)
      );
    }

    let donationHistory = [];
    if (donor_id) {
      const historyResult = await pool.query(
        "SELECT * FROM donation_history WHERE donor_id = $1",
        [donor_id]
      );
      donationHistory = historyResult.rows;
    }

    res.json({
      success: true,
      associations,
      donation_history: donationHistory,
    });

  } catch (error) {
    console.error("Recommendation API Error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});
app.get('/donations/clothes/pending', async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT d.donation_id,
             COALESCE(a.full_name, 'Donor') AS donor_name,
             d.item_image,
             d.note,
             d.status,
             d.created_at
      FROM donations d
      JOIN donors dr   ON dr.user_id = d.donor_id
      JOIN users u     ON u.user_id  = dr.user_id
      JOIN accounts a  ON a.account_id = u.account_id
      LEFT JOIN clothes_donations cd ON cd.donation_id = d.donation_id
      WHERE d.donation_type = 'clothes' AND d.status = 'pending'
      ORDER BY d.donation_id DESC
    `);
    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to fetch pending clothes donations' });
  }
});

app.post('/assoc/donations/:id/accept', async (req, res) => {
  try {
    await pool.query(`UPDATE donations SET status='accepted' WHERE donation_id=$1`, [req.params.id]);
    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to accept donation' });
  }
});

app.post('/assoc/donations/:id/reject', async (req, res) => {
  const id = req.params.id;

  try {
   
    const upd = await pool.query(
      `UPDATE donations SET status='rejected' WHERE donation_id=$1 RETURNING donation_id, donor_id`,
      [id]
    );

    if (upd.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Donation not found" });
    }

    const donor_id = upd.rows[0].donor_id; 
    await pool.query(
      `
      INSERT INTO donation_history (donation_id, donor_id, description)
      VALUES ($1, $2, 'REJECTED')
      `,
      [id, donor_id]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to reject donation" });
  }
});



app.get('/donations/clothes/accepted', async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT d.donation_id,
             COALESCE(a.full_name, 'Donor') AS donor_name,
             d.item_image,
             d.note,
             d.status,
             d.created_at,
             cd.clothes_type
      FROM donations d
      JOIN donors dr   ON dr.user_id = d.donor_id
      JOIN users u     ON u.user_id  = dr.user_id
      JOIN accounts a  ON a.account_id = u.account_id
      JOIN clothes_donations cd ON cd.donation_id = d.donation_id
      WHERE d.donation_type = 'clothes' AND d.status = 'accepted'
      ORDER BY d.donation_id DESC
    `);
    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to fetch accepted clothes donations' });
  }
});
app.get('/donations/clothes/rejected', async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT d.donation_id,
             COALESCE(a.full_name, 'Donor') AS donor_name,
             d.item_image,
             d.note,
             d.status,
             d.created_at,

             (
               SELECT MAX(h.event_time)
               FROM donation_history h
               WHERE h.donation_id = d.donation_id
                 AND h.description = 'REJECTED'
             ) AS rejected_at

      FROM donations d
      JOIN donors dr   ON dr.user_id = d.donor_id
      JOIN users u     ON u.user_id  = dr.user_id
      JOIN accounts a  ON a.account_id = u.account_id
      JOIN clothes_donations cd ON cd.donation_id = d.donation_id
      WHERE d.donation_type = 'clothes'
        AND d.status = 'rejected'
      ORDER BY d.donation_id DESC
    `);

    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to fetch rejected clothes donations' });
  }
});


app.get('/associations/clothes', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT association_id, name,description,association_logo FROM associations WHERE clothes = true"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /assoc/donations/:id/approve  -> accepted ➜ approved
app.post('/assoc/donations/:id/approve', async (req, res) => {
  try {
    await pool.query(
      `UPDATE donations SET status='approved' WHERE donation_id=$1 AND status='accepted'`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to approve donation' });
  }
});

// GET /donations/clothes/approved  -> list approved clothes
app.get('/donations/clothes/approved', async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT d.donation_id,
             COALESCE(a.full_name, 'Donor') AS donor_name,
             d.item_image,
             d.note,
             d.status,
             d.created_at,
             cd.clothes_type
      FROM donations d
      JOIN donors dr   ON dr.user_id = d.donor_id
      JOIN users u     ON u.user_id  = dr.user_id
      JOIN accounts a  ON a.account_id = u.account_id
      JOIN clothes_donations cd ON cd.donation_id = d.donation_id
      WHERE d.donation_type='clothes' AND d.status='approved'
      ORDER BY d.donation_id DESC
    `);
    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to fetch approved clothes donations' });
  }
});
app.post('/assoc/donations/:id/restore', async (req, res) => {
  const id = req.params.id;

  try {
    const q = await pool.query(
      `
      WITH last_reject AS (
        SELECT MAX(event_time) AS rejected_at
        FROM donation_history
        WHERE donation_id = $1
          AND description = 'REJECTED'
      )
      UPDATE donations
      SET status = 'pending'
      WHERE donation_id = $1
        AND status = 'rejected'
        AND (SELECT rejected_at FROM last_reject) IS NOT NULL
        AND now() <= (SELECT rejected_at FROM last_reject) + interval '2 hours'
      RETURNING donation_id
      `,
      [id]
    );

    if (q.rowCount === 0) {
      return res.status(403).json({
        ok: false,
        error: "Restore window expired (2 hours after rejection) or donation not rejected."
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to restore donation' });
  }
});
//ai expiration check
// ================================
// AI – Expiry + Food Category Check
// ================================
// =======================================
// AI – Food Analysis (Category + Expiry + Safety)
// =======================================
// =======================================
// AI – Food Analysis (Category + Expiry + Safety)
// =======================================
app.post(
  "/ai/check-expiry",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Image is required"
        });
      }

      // ==========================
      // 1️⃣ OCR – extract text
      // ==========================
      const [ocrResult] = await visionClient.textDetection(req.file.path);
      const detectedText =
        ocrResult.fullTextAnnotation?.text.toLowerCase() || "";

      // ==========================
      // 2️⃣ Vision Labels
      // ==========================
      const [labelResult] = await visionClient.labelDetection(req.file.path);
      const labels =
        labelResult.labelAnnotations?.map(l =>
          l.description.toLowerCase()
        ) || [];

      // ==========================
      // 3️⃣ FOOD CATEGORY DETECTION
      // ==========================
      let foodCategory = "غير محدد";

      if (detectedText.includes("flour") || detectedText.includes("wheat")) {
        foodCategory = "طحين";
      } else if (detectedText.includes("sugar")) {
        foodCategory = "سكر";
      } else if (detectedText.includes("rice")) {
        foodCategory = "رز";
      } else if (
        detectedText.includes("beans") ||
        detectedText.includes("fava") ||
        detectedText.includes("chickpeas")
      ) {
        foodCategory = "علب فول / حمص";
      } else if (detectedText.includes("lentils")) {
        foodCategory = "عدس";
      } else if (detectedText.includes("pasta")) {
        foodCategory = "معكرونة";
      } else if (detectedText.includes("oil")) {
        foodCategory = "زيت";
      } else if (detectedText.includes("tuna")) {
        foodCategory = "تونة";
      }

      // ==========================
      // 4️⃣ FOOD SAFETY CHECKS
      // ==========================
      let rejectReasons = [];

      // ---- 4.1 Cooked food detection (PRIORITY) ----
      const cookedKeywords = [
        "cooked",
        "meal",
        "dish",
        "plate",
        "restaurant food"
      ];

      const isCookedFood = labels.some(l =>
        cookedKeywords.some(k => l.includes(k))
      );

      if (isCookedFood) {
        rejectReasons.push("طعام مطبوخ (غير مقبول للتبرع)");
      }

      // ---- 4.2 Damaged / Rust ----
      const damageKeywords = [
        "rust",
        "corrosion",
        "damaged",
        "dirty",
        "old"
      ];

      if (labels.some(l => damageKeywords.some(k => l.includes(k)))) {
        rejectReasons.push("العبوة تالفة أو مصدية");
      }

      // ---- 4.3 Mold / Spoiled ----
      const moldKeywords = [
        "mold",
        "spoiled",
        "fungus",
        "bread mold"
      ];

      if (labels.some(l => moldKeywords.some(k => l.includes(k)))) {
        rejectReasons.push("مؤشرات عفن أو تلف في الطعام");
      }

      // ---- 4.4 No label (ONLY if NOT cooked) ----
      if (!isCookedFood && detectedText.trim().length < 10) {
        rejectReasons.push("لا يوجد ليبل أو معلومات كافية على المنتج");
      }

      // ==========================
      // 5️⃣ EXPIRY DATE DETECTION
      // ==========================
      const dateRegex =
        /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}|\d{1,2}[\/\-.]\d{4}|\d{1,2}\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s\d{4})/i;

      const match = detectedText.match(dateRegex);

      let expiryDate = null;
      let expired = null;

      if (match) {
        expiryDate = dayjs(match[1], [
          "D/M/YYYY",
          "DD/MM/YYYY",
          "D-M-YYYY",
          "DD-MM-YYYY",
          "D.M.YYYY",
          "DD.MM.YYYY",
          "M/YYYY",
          "MM/YYYY",
          "M-YYYY",
          "MM-YYYY",
          "M.YYYY",
          "MM.YYYY",
          "D MMM YYYY",
          "DD MMM YYYY"
        ], true);

        if (expiryDate.isValid()) {
          expired = expiryDate.isBefore(dayjs());
        }
      }

      // ==========================
      // 6️⃣ FINAL DECISION
      // ==========================
      const rejected = rejectReasons.length > 0;

      res.json({
        success: true,
        food_category: foodCategory,
        expiry_date: expiryDate ? expiryDate.format("YYYY-MM-DD") : null,
        expired,
        rejected,
        reject_reasons: rejectReasons,
        result: rejected
          ? "❌ مرفوض"
          : expired
          ? "❌ منتهي"
          : "✅ صالح",
        detected_text: detectedText
      });

    } catch (error) {
      console.error("AI Expiry Error:", error);
      res.status(500).json({
        success: false,
        message: "AI processing failed"
      });
    }
  }
);




// =======================
// FOOD DONATIONS ROUTES
// =======================


// GET /donations/food/accepted  -> list accepted food donations
app.get("/donations/food/accepted", async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT d.donation_id,
             COALESCE(a.full_name, 'Donor') AS donor_name,
             d.item_image,
             d.note,
             d.status,
             d.created_at,
             fd.food_type,
             fd.expiration_date
      FROM donations d
      JOIN donors dr ON dr.user_id = d.donor_id
      JOIN users u   ON u.user_id  = dr.user_id
      JOIN accounts a ON a.account_id = u.account_id
      JOIN food_donations fd ON fd.donation_id = d.donation_id
      WHERE d.donation_type = 'food'
        AND d.status = 'accepted'
      ORDER BY d.donation_id DESC
    `);

    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to fetch accepted food donations" });
  }
});


// GET /donations/food/approved  -> list approved food donations
app.get("/donations/food/approved", async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT d.donation_id,
             COALESCE(a.full_name, 'Donor') AS donor_name,
             d.item_image,
             d.note,
             d.status,
             d.created_at,
             fd.food_type,
             fd.expiration_date
      FROM donations d
      JOIN donors dr ON dr.user_id = d.donor_id
      JOIN users u   ON u.user_id  = dr.user_id
      JOIN accounts a ON a.account_id = u.account_id
      JOIN food_donations fd ON fd.donation_id = d.donation_id
      WHERE d.donation_type = 'food'
        AND d.status = 'approved'
      ORDER BY d.donation_id DESC
    `);

    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to fetch approved food donations" });
  }
});

app.use((req, res, next) => {
  console.log("REQ:", req.method, req.url);
  next();
});

// (اختياري) GET /donations/food/accepted/dates  -> distinct dates
app.get("/donations/food/accepted/dates", async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT DISTINCT to_char(d.created_at, 'YYYY-MM-DD') AS date
      FROM donations d
      WHERE d.donation_type = 'food'
        AND d.status = 'accepted'
      ORDER BY date DESC
    `);

    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to fetch dates" });
  }
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});