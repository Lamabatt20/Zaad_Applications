const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


app.get('/accounts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM accounts');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/accounts', async (req, res) => {
  const { username, password, role, email, phone, full_name } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO accounts (username, password_hash, role, email, phone, full_name)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [username, hashedPassword, role, email, phone, full_name]
    );

    res.json({ success: true, account: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM accounts WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Username not found' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    res.json({
      success: true,
      role: user.role,
      user_id: user.id,
      username: user.username
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
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
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Server error');
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

app.post('/associations', async (req, res) => {
  const { user_id, name, association_authentication, association_logo } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO associations (user_id, name, association_authentication, association_logo)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [user_id, name, association_authentication, association_logo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Server error');
  }
});


app.get('/donations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM donations');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/donations', async (req, res) => {
  const { donor_id, donation_type, item_image, note, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO donations (donor_id, donation_type, item_image, note, status)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [donor_id, donation_type, item_image, note, status || 'pending']
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
