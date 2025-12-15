const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

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
    const result = await pool.query('SELECT * FROM accounts WHERE username = $1', [username]);
    let usernameIncorrect = false;
    let passwordIncorrect = false;
    if (result.rows.length === 0) {
      usernameIncorrect = true;
    }
    let user = result.rows[0];
    if (!usernameIncorrect) {
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        passwordIncorrect = true;
      }
    }
    if (usernameIncorrect || passwordIncorrect) {
      return res.json({
        success: false,
        usernameIncorrect,
        passwordIncorrect
      });
    }
    res.json({
      success: true,
      role: user.role,
      user_id: user.account_id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      address: user.address,
      phone:user.phone
    });
  } catch (err) {
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
  const { donor_id, donation_type, note, status } = req.body;
  const file = req.file;
  try {
    const imagePath = file ? `/uploads/${file.filename}` : null;
    const result = await pool.query(
      `INSERT INTO donations (donor_id, donation_type, item_image, note, status)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [donor_id, donation_type, imagePath, note, status || 'pending']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/food_donations', async (req, res) => {
  const { donation_id, is_perishable, food_type, expiration_date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO food_donations (donation_id, is_perishable, food_type, expiration_date)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [donation_id, is_perishable, food_type, expiration_date]
    );
    res.json(result.rows[0]);
  } catch (err) {
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
      JOIN clothes_donations cd ON cd.donation_id = d.donation_id
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
  try {
    await pool.query(`UPDATE donations SET status='rejected' WHERE donation_id=$1`, [req.params.id]);
    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to reject donation' });
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
             cd.clothes_type
      FROM donations d
      JOIN donors dr   ON dr.user_id = d.donor_id
      JOIN users u     ON u.user_id  = dr.user_id
      JOIN accounts a  ON a.account_id = u.account_id
      JOIN clothes_donations cd ON cd.donation_id = d.donation_id
      WHERE d.donation_type = 'clothes' AND d.status = 'rejected'
      ORDER BY d.donation_id DESC
    `);
    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to fetch rejected clothes donations' });
  }
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
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

app.get('/associations/food', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT association_id, name,description,association_logo FROM associations WHERE food = true"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
