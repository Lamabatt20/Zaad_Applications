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
const minMax = require("dayjs/plugin/minMax");
const axios = require("axios");
const FormData = require("form-data");
const nodemailer = require("nodemailer");

dayjs.extend(minMax);



const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
function hasUsefulText(text) {
  return text && text.length > 20;
}

function mapVisionLabelToCategory(label) {
  label = label.toLowerCase();

 
  if (label.includes("bread") || label.includes("toast") || label.includes("bakery"))
    return "خبز ومخبوزات";

  
  if (label.includes("flour") || label.includes("grain") || label.includes("wheat"))
    return "طحين وحبوب";

  if (label.includes("rice"))
    return "رز";

  
  if (label.includes("pasta") || label.includes("spaghetti") || label.includes("noodle"))
    return "معكرونة";

  
  if (
    label.includes("bean") ||
    label.includes("lentil") ||
    label.includes("chickpea") ||
    label.includes("peas")
  )
    return "بقوليات";

 
  if (label.includes("canned") || label.includes("tin") || label.includes("preserved"))
    return "معلبات";

  if (label.includes("tuna") || label.includes("sardine"))
    return "معلبات سمك";


  if (label.includes("oil"))
    return "زيوت";

 
  if (label.includes("sugar"))
    return "سكر";

  
  if (
    label.includes("spice") ||
    label.includes("seasoning") ||
    label.includes("pepper") ||
    label.includes("salt")
  )
    return "بهارات وتوابل";

  if (label.includes("snack") || label.includes("chips"))
    return "سناك";

  if (label.includes("chocolate") || label.includes("candy"))
    return "حلويات";

  if (label.includes("milk") || label.includes("cheese") || label.includes("yogurt"))
    return "ألبان";

 
  if (label.includes("meat") || label.includes("chicken") || label.includes("beef"))
    return "لحوم";

 
  if (label.includes("vegetable"))
    return "خضار";

  if (label.includes("fruit"))
    return "فواكه";

  return null;
}

async function callAIService(url, imagePath) {
  try {
    const fileBuffer = fs.readFileSync(imagePath);
    const form = new FormData();
    form.append("file", fileBuffer, { filename: path.basename(imagePath) });

    const res = await axios.post(url, form, {
      headers: form.getHeaders(),
      timeout: 90000,  // 90 seconds for AI processing
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024
    });

    if (res.data.error) {
      console.error(`❌ AI Service Error at ${url}:`, res.data.error);
      throw new Error(res.data.error);
    }

    return res.data;
  } catch (error) {
    console.error(`❌ AI Service Failed at ${url}:`, error.message);
    throw error;
  }
}


// New AI Services URLs
const AI_NEW_COOKED_URL = "http://localhost:8004/predict-cooked";
const AI_NEW_CAN_DAMAGE_URL = "http://localhost:8005/predict-can-damage";

async function addDeliveryMethodColumn() {
  try {
    await pool.query(`
      ALTER TABLE donations
      ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'donor';
    `);

    console.log("✅ delivery_method column added successfully");
  } catch (err) {
    console.error("❌ Failed to add delivery_method column", err);
  }
}


addDeliveryMethodColumn();
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
async function ensureVerificationColumns() {
  try {
    const alterQuery = `
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6),
      ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP;
    `;
    await pool.query(alterQuery);
    console.log('✅ Verification columns verified/added successfully in accounts table.');
  } catch (error) {
    console.error('❌ Error adding verification columns:', error);
  }
}
async function ensureEmailVerifiedColumn() {
  try {
    const alterQuery = `
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
    `;
    await pool.query(alterQuery);
    console.log('✅ email_verified column verified/added successfully.');
  } catch (error) {
    console.error('❌ Error adding email_verified column:', error);
  }
}

ensureEmailVerifiedColumn();




ensureVerificationColumns();
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
async function ensureDonationAssociationColumn() {
  try {
    const alterQuery = `
      ALTER TABLE donations
      ADD COLUMN IF NOT EXISTS association_id INTEGER;
    `;
    await pool.query(alterQuery);
    console.log('✅ association_id column verified/added successfully in donations table.');
  } catch (error) {
    console.error('❌ Error adding association_id column to donations:', error);
  }
}
async function ensureAdminAccount() {
  try {
    // 1️⃣ Check if admin already exists
    const check = await pool.query(
      `SELECT * FROM accounts WHERE username = $1`,
      ['zaad']
    );

    if (check.rows.length > 0) {
      console.log('ℹ️ Admin account (zaad) already exists.');
      return;
    }

    // 2️⃣ Create account
    const hashedPassword = await bcrypt.hash("Zaad@1234", 10);

    const accountRes = await pool.query(`
      INSERT INTO accounts
      (
        username,
        password_hash,
        role,
        full_name,
        email,
        phone,
        address,
        phone_verified,
        is_approved
      )
      VALUES ($1,$2,'admin',$3,$4,$5,$6,true,true)
      RETURNING account_id
    `, [
      'zaad',
      hashedPassword,
      'Zaad System Admin',
      'admin@zaad.ps',
      '0590000000',
      'Zaad Headquarters'
    ]);

    const accountId = accountRes.rows[0].account_id;

    // 3️⃣ Create user
    const userRes = await pool.query(
      `INSERT INTO users (account_id)
       VALUES ($1)
       RETURNING user_id`,
      [accountId]
    );

    const userId = userRes.rows[0].user_id;

    // 4️⃣ Create admin (same logic as /admins endpoint)
    await pool.query(
      `INSERT INTO admins (user_id, privileges)
       VALUES ($1, $2)`,
      [
        userId,
        {
          approve_associations: true,
          manage_users: true,
          view_reports: true
        }
      ]
    );

    console.log('✅ Admin account (zaad) created successfully.');

  } catch (error) {
    console.error('❌ Error creating admin account:', error);
  }
}


ensureAdminAccount();
 ensureDonationAssociationColumn();
dropIsPerishableColumn();
ensureDonationAddressColumn();
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_EMAIL_PASSWORD,
  },
});

async function sendEmail(to, subject, html) {
  return transporter.sendMail({
    from: `"Zaad Admin" <${process.env.ADMIN_EMAIL}>`,
    to,
    subject,
    html,
  });
}


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

  if (!username || !password || !role || !phone) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }

  try {
    // 1️⃣ Check username or phone already exists
    const exists = await pool.query(
      `SELECT 1 FROM accounts WHERE username=$1 OR phone=$2`,
      [username, phone]
    );

    if (exists.rows.length > 0) {
      return res.json({
        success: false,
        message: "Username or phone already exists"
      });
    }

    // 2️⃣ Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Approval logic
    const isApproved = role === 'donor'; // donor approved مباشرة
    const phoneVerified = false;

    // 4️⃣ Insert account
    const result = await pool.query(
      `
      INSERT INTO accounts (
  username,
  password_hash,
  role,
  email,
  phone,
  full_name,
  address,
  phone_verified,
  email_verified,
  is_approved,
  verification_code,
  verification_expires
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$10,$11)

      RETURNING account_id, phone
      `,
          [
      username,
      hashedPassword,
      role,
      email,
      phone,
      full_name,
      address,
      phoneVerified,
      isApproved,
      verificationCode,
      expiresAt
    ]

    );

   await sendEmail(
  email,
  "رمز التحقق – منصة زاد",
  `
  <div style="font-family: Arial; direction: rtl">
    <h2>مرحباً ${full_name || username} 👋</h2>
    <p>رمز التحقق الخاص بك هو:</p>
    <h1 style="letter-spacing: 4px">${verificationCode}</h1>
    <p>الرمز صالح لمدة <b>5 دقائق</b>.</p>
    <br/>
    <p>فريق زاد 🤍</p>
  </div>
  `
);


    res.json({
      success: true,
      message: "Account created. Verification code sent.",
      account_id: result.rows[0].account_id,
      next_step: "verify_phone"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});
app.post('/accounts/verify-email', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.json({
      success: false,
      message: "Missing email or code"
    });
  }

  try {
    const cleanCode = code.toString().trim();

    const result = await pool.query(
      `
      SELECT account_id
      FROM accounts
      WHERE email = $1
        AND verification_code = $2
        AND verification_expires > NOW()
      `,
      [email, cleanCode]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: "Invalid or expired code"
      });
    }

    await pool.query(
      `
      UPDATE accounts
      SET email_verified = true,
          verification_code = NULL,
          verification_expires = NULL
      WHERE email = $1
      `,
      [email]
    );

    res.json({
      success: true,
      message: "Email verified successfully"
    });

  } catch (err) {
    console.error("VERIFY EMAIL ERROR:", err);
    res.status(500).json({ success: false });
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



app.post("/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "username and password are required",
    });
  }

  try {
    const accRes = await pool.query(
      "SELECT * FROM accounts WHERE username=$1",
      [username]
    );

    if (accRes.rows.length === 0) {
      return res.json({ success: false, usernameIncorrect: true });
    }

    const account = accRes.rows[0];

    const match = await bcrypt.compare(password, account.password_hash);
    if (!match) {
      return res.json({ success: false, passwordIncorrect: true });
    }

    if (!account.email_verified) {
      return res.json({
        success: false,
        notVerified: true,
        message: "Account not verified",
      });
    }

    if (account.role === "association" && !account.is_approved) {
      return res.json({
        success: false,
        notApproved: true,
        message: "Waiting admin approval",
      });
    }

    // ==========================
    // ✅ Association extra data
    // ==========================
    let food = false;
    let clothes = false;
    let association_id = null;

    if (account.role === "association") {
      const assocRes = await pool.query(
        `
        SELECT a.association_id, a.food, a.clothes
        FROM associations a
        JOIN users u ON a.user_id = u.user_id
        WHERE u.account_id = $1
        `,
        [account.account_id]
      );

      if (assocRes.rows.length > 0) {
        food = assocRes.rows[0].food;
        clothes = assocRes.rows[0].clothes;
        association_id = assocRes.rows[0].association_id;
      }
    }

    // ==========================
    // ✅ Final response
    // ==========================
    res.json({
      success: true,
      role: account.role,
      user_id: account.account_id,
      username: account.username,
      email: account.email,
      full_name: account.full_name,
      phone: account.phone,
      address: account.address,
      food,
      clothes,
      association_id,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
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
 const { donor_id, donation_type, note, status, address, association_id } = req.body;
  const file = req.file;
  console.log('📦 POST /donations - Received:', { donor_id, donation_type, note, status, address, association_id, file: file?.filename });
  try {
    const imagePath = file ? `/uploads/${file.filename}` : null;
    const result = await pool.query(
      `INSERT INTO donations (donor_id, donation_type, item_image, note, status, address, association_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [donor_id, donation_type, imagePath, note, status || 'pending', address,association_id || null]
    );
    console.log('✅ Donation created:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
   console.error('❌ Donation creation error:', err);
   res.status(500).json({
      success: false,
      message: err.message || "Server error"
});
  }
});

app.post('/food_donations', async (req, res) => {
  const { donation_id, food_type, expiration_date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO food_donations (donation_id,food_type, expiration_date)
       VALUES ($1,$2,$3) RETURNING *`,
      [donation_id, food_type, expiration_date]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Server error"
});
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
  const { association_id } = req.query;
  try {
    let query = `
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
      WHERE d.donation_type = 'clothes' AND d.status = 'pending'`;
    
    const params = [];
    if (association_id) {
      query += ` AND d.association_id = $1`;
      params.push(association_id);
    }
    
    query += ` ORDER BY d.donation_id DESC`;
    
    const q = await pool.query(query, params);
    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to fetch pending clothes donations' });
  }
});
app.get('/assoc/delivery-persons', async (req, res) => {
  const { association_id } = req.query;
  if (!association_id) return res.status(400).json({ ok:false, error:'association_id required' });

  try {
    const q = await pool.query(`
      SELECT dp.delivery_person_id,
             dp.status,
             COALESCE(acc.full_name, dp.name) AS name,
             COALESCE(acc.phone, dp.phone_number) AS phone,
             acc.email
      FROM delivery_persons dp
      JOIN users u ON u.user_id = dp.user_id
      JOIN accounts acc ON acc.account_id = u.account_id
      WHERE dp.association_id = $1
        AND acc.is_approved = true
      ORDER BY dp.delivery_person_id DESC
    `, [association_id]);

    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to fetch delivery persons' });
  }
});

app.post('/assoc/donations/:id/accept', async (req, res) => {
  const id = req.params.id;

  try {
    const d = await pool.query(
      `SELECT donation_id, donor_id, delivery_method
       FROM donations
       WHERE donation_id = $1`,
      [id]
    );

    if (d.rows.length === 0) {
      return res.status(404).json({ ok:false, error:'Donation not found' });
    }

    const method = d.rows[0].delivery_method || 'donor';
    const deliveryStatus = (method === 'association') ? 'NEEDS_ASSIGNMENT' : 'WAITING_FOR_DONOR';

    await pool.query(
      `UPDATE donations
       SET status='accepted',
           delivery_status=$2
       WHERE donation_id=$1`,
      [id, deliveryStatus]
    );

    await pool.query(
      `INSERT INTO donation_history (donation_id, donor_id, description)
       VALUES ($1, $2, 'ACCEPTED')`,
      [id, d.rows[0].donor_id]
    );

    res.json({ ok:true, donation_id:Number(id), delivery_method:method, delivery_status:deliveryStatus });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to accept donation' });
  }
});
app.post('/assoc/donations/:id/assign-delivery', async (req, res) => {
  const donationId = req.params.id;
  const { delivery_person_id } = req.body;

  if (!delivery_person_id) return res.status(400).json({ ok:false, error:'delivery_person_id required' });

  try {
    const d = await pool.query(
      `SELECT donation_id, status, delivery_method, association_id
       FROM donations
       WHERE donation_id=$1`,
      [donationId]
    );
    if (d.rows.length === 0) return res.status(404).json({ ok:false, error:'Donation not found' });

    const row = d.rows[0];
    if (row.status !== 'accepted') return res.status(400).json({ ok:false, error:'Donation not accepted' });
    if ((row.delivery_method || 'donor') !== 'association') {
      return res.status(400).json({ ok:false, error:'Delivery method is not association' });
    }

    const dp = await pool.query(`
      SELECT dp.delivery_person_id
      FROM delivery_persons dp
      JOIN users u ON u.user_id = dp.user_id
      JOIN accounts acc ON acc.account_id = u.account_id
      WHERE dp.delivery_person_id=$1
        AND dp.association_id=$2
        AND acc.is_approved=true
    `, [delivery_person_id, row.association_id]);

    if (dp.rows.length === 0) {
      return res.status(400).json({ ok:false, error:'Delivery person not approved or not in this association' });
    }

    await pool.query(
      `UPDATE donations
       SET delivery_person_id=$2,
           delivery_status='ASSIGNED'
       WHERE donation_id=$1`,
      [donationId, delivery_person_id]
    );

    // optional: keep your donation_deliveries table in sync
    await pool.query(
      `INSERT INTO donation_deliveries (delivery_person_id, donation_id, delivery_status)
       VALUES ($1,$2,'ASSIGNED')
       ON CONFLICT DO NOTHING`,
      [delivery_person_id, donationId]
    );

    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to assign delivery person' });
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
  const { association_id } = req.query;
  try {
    let query = `
      SELECT d.donation_id,
             COALESCE(a.full_name, 'Donor') AS donor_name,
             d.item_image,
             d.note,
             d.status,
             d.created_at,
             cd.clothes_type,
             COALESCE(d.delivery_method,'donor') AS delivery_method,
             d.delivery_status,
             d.delivery_person_id
      FROM donations d
      JOIN donors dr   ON dr.user_id = d.donor_id
      JOIN users u     ON u.user_id  = dr.user_id
      JOIN accounts a  ON a.account_id = u.account_id
      JOIN clothes_donations cd ON cd.donation_id = d.donation_id
      WHERE d.donation_type = 'clothes' AND d.status = 'accepted'`;

    const params = [];
    if (association_id) {
      query += ` AND d.association_id = $1`;
      params.push(association_id);
    }

    query += ` ORDER BY d.donation_id DESC`;

    const q = await pool.query(query, params);
    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to fetch accepted clothes donations' });
  }
});

app.get('/donations/clothes/rejected', async (req, res) => {
  const { association_id } = req.query;
  try {
    let query = `
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
        AND d.status = 'rejected'`;
    
    const params = [];
    if (association_id) {
      query += ` AND d.association_id = $1`;
      params.push(association_id);
    }
    
    query += ` ORDER BY d.donation_id DESC`;
    
    const q = await pool.query(query, params);

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
    const d = await pool.query(
      `SELECT donation_id, delivery_method, delivery_status
       FROM donations
       WHERE donation_id=$1`,
      [req.params.id]
    );

    if (d.rows.length === 0) return res.status(404).json({ ok: false });

    const method = d.rows[0].delivery_method || 'donor';
    const current = d.rows[0].delivery_status || null;

    let nextDeliveryStatus = current;

    if (method === 'association') {
      // إذا ما تعيّن سواق بعد
      if (!current || current === 'NEEDS_ASSIGNMENT') {
        nextDeliveryStatus = 'NEEDS_ASSIGNMENT';
      }
      // إذا كانت ASSIGNED أو PICKED_UP أو DELIVERED... خليها زي ما هي
    } else {
      // donor delivers
      nextDeliveryStatus = 'WAITING_FOR_DONOR';
    }

    await pool.query(
      `UPDATE donations
       SET status='approved',
           delivery_status=$2
       WHERE donation_id=$1`,
      [req.params.id, nextDeliveryStatus]
    );

    res.json({ ok: true, delivery_status: nextDeliveryStatus });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});
// GET /donations/clothes/approved  -> list approved clothes (with delivery tracking)
app.get('/donations/clothes/approved', async (req, res) => {
  const { association_id } = req.query;

  try {
    let query = `
      SELECT d.donation_id,
             COALESCE(a.full_name, 'Donor') AS donor_name,
             d.item_image,
             d.note,
             d.status,
             d.created_at,
             cd.clothes_type,

             COALESCE(d.delivery_method,'donor') AS delivery_method,
             d.delivery_status,
             d.delivery_person_id,
             COALESCE(dp.name,'') AS delivery_person_name

      FROM donations d
      JOIN donors dr   ON dr.user_id = d.donor_id
      JOIN users u     ON u.user_id  = dr.user_id
      JOIN accounts a  ON a.account_id = u.account_id
      JOIN clothes_donations cd ON cd.donation_id = d.donation_id
      LEFT JOIN delivery_persons dp ON dp.delivery_person_id = d.delivery_person_id

      WHERE d.donation_type='clothes'
        AND d.status='approved'
    `;

    const params = [];
    if (association_id) {
      query += ` AND d.association_id = $1`;
      params.push(association_id);
    }

    query += ` ORDER BY d.donation_id DESC`;

    const q = await pool.query(query, params);
    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Failed to fetch approved clothes donations' });
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


// =======================
// NEW AI ENDPOINT - Using ai_services_new models
// =======================
app.post(
  "/ai/check-food-new",
  upload.array("images", 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Images are required"
        });
      }

      let categoryVotes = {};
      let expiryDates = [];
      let detectedTexts = [];

      for (const file of req.files) {

        console.log(`\n[IMAGE] Processing: ${file.originalname}`);

        /* =========================
           0️⃣ PACKAGED vs COOKED (NEW MODEL) - CHECK FIRST
        ========================= */
        console.log(`[CHECK-0] Checking if food is packaged or cooked (NEW MODEL)...`);
        const packagedResult = await callAIService(
          AI_NEW_COOKED_URL,
          file.path
        );
        console.log(`[PACKAGED-RESULT-NEW]`, {
          status: packagedResult.status,
          confidence: packagedResult.confidence.toFixed(2)
        });

        if (packagedResult.status === "cooked") {
          console.log(`[REJECTED] Food is cooked - REJECTED\n`);
          fs.unlinkSync(file.path);
          return res.json({
            success: false,
            rejected: true,
            reason: "❌ الطعام مطبوخ – لا يمكن التبرع به",
            confidence: packagedResult.confidence,
            model: "new"
          });
        }

        console.log(`✅ [PASS] Image passed packaged/cooked check - Status: ${packagedResult.status}`);

        /* =========================
           1️⃣ CAN DAMAGE CHECK (NEW MODEL)
        ========================= */
        console.log(`[CHECK-1] Checking for can damage (NEW MODEL)...`);
        const canDamageResult = await callAIService(
          AI_NEW_CAN_DAMAGE_URL,
          file.path
        );
        console.log(`[CAN-DAMAGE-RESULT-NEW]`, {
          status: canDamageResult.status,
          confidence: canDamageResult.confidence.toFixed(2),
          details: canDamageResult.details
        });

        if (canDamageResult.status === "damaged") {
          console.log(`[REJECTED] Can is damaged - REJECTED`);
          
          // Build detailed rejection message
          let damageDetails = [];
          if (canDamageResult.details?.rust_detected) {
            damageDetails.push(`صدأ (${canDamageResult.details.rust_percentage?.toFixed(1)}%)`);
          }
          if (canDamageResult.details?.dent_detected) {
            damageDetails.push("انبعاج");
          }
          if (canDamageResult.details?.corrosion_detected) {
            damageDetails.push("تآكل");
          }
          
          const detailsText = damageDetails.length > 0 
            ? ` - ${damageDetails.join(", ")}` 
            : "";
          
          fs.unlinkSync(file.path);
          return res.json({
            success: false,
            rejected: true,
            reason: `❌ المعلب تالف أو متضرر${detailsText}`,
            confidence: canDamageResult.confidence,
            details: canDamageResult.details,
            model: "new"
          });
        }

        console.log(`✅ [PASS] Image passed damage check - Status: ${canDamageResult.status}`);

        /* =========================
           2️⃣ OCR – extract text
        ========================= */
        console.log(`[OCR] Extracting text from image...`);
        const [ocrResult] = await visionClient.textDetection(file.path);
        const detectedText =
          ocrResult.fullTextAnnotation?.text.toLowerCase() || "";
        console.log(`[OCR] Text extracted: "${detectedText.substring(0, 60)}${detectedText.length > 60 ? '...' : ''}"`);

        detectedTexts.push(detectedText);

        /* =========================
           2️⃣ CATEGORY FROM TEXT
        ========================= */
        let foodCategory = null;

        if (
          detectedText.includes("bread") ||
          detectedText.includes("toast") ||
          detectedText.includes("خبز") ||
          detectedText.includes("توست")
        ) foodCategory = "خبز ومخبوزات";
        else if (
          detectedText.includes("flour") ||
          detectedText.includes("wheat")
        ) foodCategory = "طحين وحبوب";
        else if (detectedText.includes("rice")) foodCategory = "رز";
        else if (detectedText.includes("pasta")) foodCategory = "معكرونة";
        else if (detectedText.includes("sugar")) foodCategory = "سكر";
        else if (
          detectedText.includes("bean") ||
          detectedText.includes("lentil") ||
          detectedText.includes("chickpea")
        ) foodCategory = "بقوليات";
        else if (detectedText.includes("oil")) foodCategory = "زيوت";
        else if (detectedText.includes("tuna")) foodCategory = "معلبات سمك";

        /* =========================
           3️⃣ CATEGORY FROM IMAGE (Fallback)
        ========================= */
        if (!foodCategory || !hasUsefulText(detectedText)) {
          const [labelResult] = await visionClient.labelDetection(file.path);
          const labels =
            labelResult.labelAnnotations?.map(l =>
              l.description.toLowerCase()
            ) || [];

          for (const label of labels) {
            const mapped = mapVisionLabelToCategory(label);
            if (mapped) {
              foodCategory = mapped;
              break;
            }
          }
        }

        if (!foodCategory) foodCategory = "مواد غذائية";

        console.log(`[CATEGORY] Food Category: ${foodCategory}`);

        categoryVotes[foodCategory] =
          (categoryVotes[foodCategory] || 0) + 1;

        /* =========================
           4️⃣ EXPIRY DATE DETECTION
        ========================= */
        console.log(`[EXPIRY] Extracting expiry date from text...`);

        let match = null;

        const expDateRegex =
          /(exp(?:iry)?\.?\s*date|ex\.?\s*date|exp|expiry|صالح لغاية)\s*[:\-]?\s*(\d{8}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s\d{4})/i;

        const expMatch = detectedText.match(expDateRegex);
        if (expMatch) match = expMatch[2];

        if (!match) {
          const generalDateRegex =
            /(\d{8}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s\d{4})/i;
          const generalMatch = detectedText.match(generalDateRegex);
          if (generalMatch) match = generalMatch[1];
        }

        if (match) {
          let parsedDate = null;

          if (/^\d{8}$/.test(match)) {
            const day = match.substring(0, 2);
            const month = match.substring(2, 4);
            const year = match.substring(4, 8);
            parsedDate = dayjs(`${year}-${month}-${day}`, "YYYY-MM-DD", true);
          } else {
            parsedDate = dayjs(match, [
              "D/M/YYYY",
              "DD/MM/YYYY",
              "D-M-YYYY",
              "DD-MM-YYYY",
              "D.M.YYYY",
              "DD.MM.YYYY",
              "D MMM YYYY",
              "DD MMM YYYY",
              "D/M/YY",
              "DD/MM/YY",
              "D-M-YY",
              "DD-MM-YY",
              "MM/YYYY"
            ], true);
          }

          if (parsedDate && parsedDate.isValid()) {
            expiryDates.push(parsedDate);
            console.log(`[EXPIRY-FOUND] Date: ${parsedDate.format("YYYY-MM-DD")}`);
          }
        }

        fs.unlinkSync(file.path);
      }

      /* =========================
         5️⃣ FINAL DECISION
      ========================= */
      console.log(`\n========== FINAL RESULT (NEW MODEL) ==========`);
      
      // Get most voted category
      const foodCategory = Object.keys(categoryVotes).length > 0 
        ? Object.keys(categoryVotes).reduce((a, b) => 
            categoryVotes[a] > categoryVotes[b] ? a : b
          )
        : "مواد غذائية";
      
      console.log(`[CATEGORY] Food: ${foodCategory}`);
      const expiryDate =
        expiryDates.length > 0
          ? expiryDates.reduce((latest, current) =>
              current.isAfter(latest) ? current : latest
            )
          : null;
      console.log(`[EXPIRY] Date: ${expiryDate ? expiryDate.format("YYYY-MM-DD") : "NOT FOUND"}`);

      const expired =
        expiryDate ? expiryDate.isBefore(dayjs()) : false;

      let expiryConfidence = expiryDates.length > 0 ? "high" : "low";

      console.log(`[STATUS] ${expired ? "EXPIRED" : "VALID"} (Confidence: ${expiryConfidence})`);
      console.log(`==============================================\n`);

      res.json({
        success: true,
        food_category: foodCategory,
        expiry_date: expiryDate
          ? expiryDate.format("YYYY-MM-DD")
          : null,
        expired,
        expiry_confidence: expiryConfidence,
        need_clear_image: expiryConfidence !== "high",
        result:
          expiryConfidence !== "high"
            ? "❗ تاريخ غير واضح – يرجى إعادة التصوير"
            : expired
            ? "❌ منتهي"
            : "✅ صالح",
        detected_texts: detectedTexts,
        model: "new"
      });

    } catch (error) {
      console.error("AI Expiry Error (NEW):", error);
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
  const { association_id } = req.query;
  try {
    let query = `
      SELECT d.donation_id,
             COALESCE(a.full_name, 'Donor') AS donor_name,
             d.item_image,
             d.note,
             d.status,
             d.created_at,
             fd.food_type,
             fd.expiration_date,
             COALESCE(d.delivery_method,'donor') AS delivery_method,
             d.delivery_status,
             d.delivery_person_id
      FROM donations d
      JOIN donors dr ON dr.user_id = d.donor_id
      JOIN users u   ON u.user_id  = dr.user_id
      JOIN accounts a ON a.account_id = u.account_id
      JOIN food_donations fd ON fd.donation_id = d.donation_id
      WHERE d.donation_type = 'food'
        AND d.status = 'accepted'`;

    const params = [];
    if (association_id) {
      query += ` AND d.association_id = $1`;
      params.push(association_id);
    }

    query += ` ORDER BY d.donation_id DESC`;

    const q = await pool.query(query, params);
    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to fetch accepted food donations" });
  }
});


// GET /donations/food/approved  -> list approved food (with delivery tracking)
app.get("/donations/food/approved", async (req, res) => {
  const { association_id } = req.query;

  try {
    let query = `
      SELECT d.donation_id,
             COALESCE(a.full_name, 'Donor') AS donor_name,
             d.item_image,
             d.note,
             d.status,
             d.created_at,
             fd.food_type,
             fd.expiration_date,

             COALESCE(d.delivery_method,'donor') AS delivery_method,
             d.delivery_status,
             d.delivery_person_id,
             COALESCE(dp.name,'') AS delivery_person_name

      FROM donations d
      JOIN donors dr ON dr.user_id = d.donor_id
      JOIN users u   ON u.user_id  = dr.user_id
      JOIN accounts a ON a.account_id = u.account_id
      JOIN food_donations fd ON fd.donation_id = d.donation_id
      LEFT JOIN delivery_persons dp ON dp.delivery_person_id = d.delivery_person_id

      WHERE d.donation_type = 'food'
        AND d.status = 'approved'
    `;

    const params = [];
    if (association_id) {
      query += ` AND d.association_id = $1`;
      params.push(association_id);
    }

    query += ` ORDER BY d.donation_id DESC`;

    const q = await pool.query(query, params);
    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to fetch approved food donations" });
  }
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

app.post('/admin/approve-association/:account_id', async (req, res) => {
  const { account_id } = req.params;

  try {
    // 1️⃣ Get account first (to retrieve email & name)
    const accountRes = await pool.query(
      `SELECT account_id, full_name, email FROM accounts 
       WHERE account_id = $1 AND role = 'association' AND email_verified = true`,
      [account_id]
    );

    if (accountRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Association not found or email not verified"
      });
    }

    const { full_name, email } = accountRes.rows[0];

    // 2️⃣ Update to approve
    await pool.query(
      `UPDATE accounts SET is_approved = true WHERE account_id = $1`,
      [account_id]
    );

    // 3️⃣ Send approval email
    await sendEmail(
      email,
      "تمت الموافقة على حساب جمعيتكم – منصة زاد",
      `
        <div style="font-family: Arial; direction: rtl">
          <h2>مرحباً ${full_name} 🌸</h2>
          <p>
            يسعدنا إعلامكم بأنه تمت الموافقة على حساب جمعيتكم في منصة <b>زاد</b>.
          </p>
          <p>
            يمكنكم الآن تسجيل الدخول وبدء استقبال التبرعات.
          </p>
          <br/>
          <p>مع تحيات فريق زاد 🤍</p>
        </div>
      `
    );

    res.json({
      success: true,
      message: "Association approved and email sent successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/admin/pending-associations', async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT 
        acc.account_id,
        acc.full_name,
        acc.email,
        acc.phone,
        a.association_authentication
      FROM accounts acc
      JOIN users u ON u.account_id = acc.account_id
      JOIN associations a ON a.user_id = u.user_id
      WHERE acc.role = 'association'
        AND acc.email_verified = true
        AND acc.is_approved = false
    `);

    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
});

async function ensureAccountsApprovalColumns() {
  try {
    await pool.query(`
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
    `);
    console.log("✅ accounts.is_approved verified/added");
  } catch (err) {
    console.error("❌ ensureAccountsApprovalColumns:", err);
  }
}
ensureAccountsApprovalColumns();
async function ensureDeliveryPersonsUserLink() {
  try {
    await pool.query(`
      ALTER TABLE delivery_persons
      ADD COLUMN IF NOT EXISTS user_id INTEGER UNIQUE;
    `);

    // add FK safely (if not exists)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_delivery_persons_user'
        ) THEN
          ALTER TABLE delivery_persons
          ADD CONSTRAINT fk_delivery_persons_user
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    console.log("✅ delivery_persons.user_id verified/added");
  } catch (err) {
    console.error("❌ ensureDeliveryPersonsUserLink:", err);
  }
}
ensureDeliveryPersonsUserLink();
async function ensureDonationDeliveryTracking() {
  try {
    await pool.query(`
      ALTER TABLE donations
      ADD COLUMN IF NOT EXISTS delivery_status TEXT,
      ADD COLUMN IF NOT EXISTS delivery_person_id INTEGER,
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
    `);
    console.log("✅ donations delivery tracking columns verified/added");
  } catch (err) {
    console.error("❌ ensureDonationDeliveryTracking:", err);
  }
}
ensureDonationDeliveryTracking();
app.post('/assoc/delivery-persons', async (req, res) => {
  const { association_id, username, password, full_name, phone, email } = req.body;

  if (!association_id || !username || !password || !phone) {
    return res.status(400).json({ ok:false, error:'Missing required fields' });
  }

  try {
    const exists = await pool.query(
      `SELECT 1 FROM accounts WHERE username=$1 OR phone=$2`,
      [username, phone]
    );
    if (exists.rows.length > 0) {
      return res.json({ ok:false, error:'Username or phone already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const acc = await pool.query(`
      INSERT INTO accounts (username, password_hash, role, email, phone, full_name, is_approved)
      VALUES ($1,$2,'delivery',$3,$4,$5,false)
      RETURNING account_id
    `, [username, hashed, email || null, phone, full_name || null]);

    const account_id = acc.rows[0].account_id;

    const u = await pool.query(
      `INSERT INTO users (account_id) VALUES ($1) RETURNING user_id`,
      [account_id]
    );
    const user_id = u.rows[0].user_id;

    const dp = await pool.query(`
      INSERT INTO delivery_persons (association_id, user_id, status, name, phone_number)
      VALUES ($1,$2,'pending',$3,$4)
      RETURNING delivery_person_id
    `, [association_id, user_id, full_name || username, phone]);

    res.json({
      ok:true,
      message:"Delivery person created (pending admin approval)",
      delivery_person_id: dp.rows[0].delivery_person_id,
      account_id,
      user_id
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to create delivery person' });
  }
});
app.post('/admin/approve-delivery/:account_id', async (req, res) => {
  const { account_id } = req.params;

  try {
    await pool.query(
      `UPDATE accounts SET is_approved=true WHERE account_id=$1 AND role='delivery'`,
      [account_id]
    );

    await pool.query(`
      UPDATE delivery_persons dp
      SET status='active'
      FROM users u
      WHERE dp.user_id = u.user_id
        AND u.account_id = $1
    `, [account_id]);

    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Failed to approve delivery person' });
  }
});

// ===== request_donations  =====
async function createRequestDonationsTable() {
  try {
    // Drop old table if exists
    await pool.query(`DROP TABLE IF EXISTS request_donations CASCADE;`);
    
    // Create new table without FK constraint
    const query = `
      CREATE TABLE IF NOT EXISTS request_donations (
        request_id SERIAL PRIMARY KEY,
        association_id INT NOT NULL,
        donation_type VARCHAR(30),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'ACTIVE'
      );
    `;
    await pool.query(query);
    console.log("✅ Table request_donations recreated successfully (no FK constraint)");
  } catch (err) {
    console.error("❌ Error creating request_donations table:", err);
  }
}
createRequestDonationsTable();


app.post('/assoc/request-donation', async (req, res) => {
  try {
    const { association_id, donation_type, description } = req.body;
    
    console.log('📝 POST /assoc/request-donation - Received:', { association_id, donation_type, description });

    const result = await pool.query(
      `INSERT INTO request_donations 
       (association_id, donation_type, description) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [association_id, donation_type, description]
    );

    console.log('✅ Request created:', result.rows[0]);

    res.status(201).json({
      ok: true,
      success: true,
      message: "Request added successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Request creation error:', error);
    res.status(500).json({ ok: false, success: false, error: "Server Error" });
  }
});
app.get('/assoc/request-donations/:association_id', async (req, res) => {
  const { association_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM request_donations WHERE association_id = $1 ORDER BY created_at DESC`,
      [association_id]
    );

    res.json({ 
      ok: true, 
      success: true,
      requests: result.rows 
    });
  } catch (error) {
    console.error("Error fetching request donations:", error);
    res.status(500).json({ ok: false, success: false, error: "Server error" });
  }
});
app.post('/accounts/resend-email-code', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email is required" });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    const userRes = await pool.query(
      `SELECT full_name FROM accounts WHERE LOWER(email) = $1`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.json({ success: false, message: "Account not found" });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      `
      UPDATE accounts
      SET verification_code = $1,
          verification_expires = $2
      WHERE LOWER(email) = $3
      `,
      [verificationCode, expiresAt, cleanEmail]
    );

    await sendEmail(
      cleanEmail,
      "رمز التحقق الجديد – منصة زاد",
      `
      <div style="font-family: Arial; direction: rtl">
        <h2>مرحباً ${userRes.rows[0].full_name || ''} 👋</h2>
        <p>رمز التحقق الجديد هو:</p>
        <h1 style="letter-spacing: 4px">${verificationCode}</h1>
        <p>الرمز صالح لمدة <b>5 دقائق</b>.</p>
        <br/>
        <p>فريق زاد 🤍</p>
      </div>
      `
    );

    res.json({ success: true, message: "Verification code resent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at http://localhost:${port}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
