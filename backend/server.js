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
async function ensureDeliveryPersonCarType() {
  try {
    await pool.query(`
      ALTER TABLE delivery_persons
      ADD COLUMN IF NOT EXISTS car_type VARCHAR(50);
    `);
    console.log("✅ delivery_persons.car_type verified/added");
  } catch (err) {
    console.error("❌ ensureDeliveryPersonCarType:", err);
  }
}

ensureDeliveryPersonCarType();
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
    // ==========================
    // 1️⃣ Get account
    // ==========================
    const accRes = await pool.query(
      "SELECT * FROM accounts WHERE username = $1",
      [username]
    );

    if (accRes.rows.length === 0) {
      return res.json({ success: false, usernameIncorrect: true });
    }

    const account = accRes.rows[0];

    // ==========================
    // 2️⃣ Check password
    // ==========================
    const match = await bcrypt.compare(password, account.password_hash);
    if (!match) {
      return res.json({ success: false, passwordIncorrect: true });
    }

    // ==========================
    // 3️⃣ Email verified?
    // ==========================
    if (!account.email_verified) {
      return res.json({
        success: false,
        notVerified: true,
        message: "Account not verified",
      });
    }

    // ==========================
    // 4️⃣ Association approval
    // ==========================
    if (account.role === "association" && !account.is_approved) {
      return res.json({
        success: false,
        notApproved: true,
        message: "Waiting admin approval",
      });
    }

    // ==========================
    // Extra data containers
    // ==========================
    let food = false;
    let clothes = false;
    let association_id = null;
    let delivery_person_id = null;

    // ==========================
    // 5️⃣ Association extra data
    // ==========================
    if (account.role === "association") {
      const assocRes = await pool.query(
        `
        SELECT a.association_id, a.food, a.clothes
        FROM associations a
        JOIN users u ON u.user_id = a.user_id
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
    // 6️⃣ ✅ DELIVERY extra data (🔥 الحل)
    // ==========================
    if (account.role === "delivery") {
      const dpRes = await pool.query(
        `
        SELECT dp.delivery_person_id
        FROM delivery_persons dp
        JOIN users u ON u.user_id = dp.user_id
        WHERE u.account_id = $1
        `,
        [account.account_id]
      );

      if (dpRes.rows.length > 0) {
        delivery_person_id = dpRes.rows[0].delivery_person_id;
      }
    }

    // ==========================
    // 7️⃣ Final response
    // ==========================
    res.json({
      success: true,
      role: account.role,
      user_id: account.account_id, // account_id يستخدم بالفرونت
      username: account.username,
      email: account.email,
      full_name: account.full_name,
      phone: account.phone,
      address: account.address,

      // association
      food,
      clothes,
      association_id,

      // delivery
      delivery_person_id, 
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
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

// Generic endpoint to get associations by donation type (must come before :id)
app.get('/associations/:param', async (req, res) => {
  try {
    const { param } = req.params;
    console.log('📋 [GET /associations/:param] Param:', param);
    
    // Check if it's a number (ID) or text (donation type)
    if (!isNaN(param)) {
      // It's an ID - fetch specific association
      const result = await pool.query(
        'SELECT * FROM associations WHERE association_id = $1',
        [parseInt(param)]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Association not found' });
      }
      console.log('✅ [GET /associations/:param] Found by ID:', result.rows[0].name);
      return res.json(result.rows[0]);
    } else {
      // It's a donation type
      let query = '';
      if (param === 'clothes') {
        query = "SELECT association_id, name, description, association_logo FROM associations WHERE clothes = true";
      } else if (param === 'food') {
        query = "SELECT association_id, name, description, association_logo FROM associations WHERE food = true";
      } else {
        return res.status(400).json({ error: "Invalid donation type" });
      }
      
      const result = await pool.query(query);
      console.log('✅ [GET /associations/:param] Found:', result.rows.length, 'associations for', param);
      return res.json(result.rows);
    }
  } catch (err) {
    console.error('❌ [GET /associations/:param] Error:', err);
    res.status(500).json({ error: "Server error" });
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
  const {
    donor_id,
    donation_type,
    note,
    status,
    address,
    association_id,
    delivery_method 
  } = req.body;

  try {
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const method = (delivery_method || 'donor').toLowerCase(); 
    const result = await pool.query(
      `INSERT INTO donations
        (donor_id, donation_type, item_image, note, status, address, association_id, delivery_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        donor_id,
        donation_type,
        imagePath,
        note,
        status || 'pending',
        address,
        association_id || null,
        method
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Donation creation error:', err);
    res.status(500).json({ success:false, message: err.message || "Server error" });
  }
});

app.post('/food_donations', upload.none(), async (req, res) => {
  const { donation_id, category, expiry_date } = req.body;
  console.log("🍽️ [POST /food_donations] Request body:", { donation_id, category, expiry_date });
  
  try {
    if (!donation_id) {
      console.error("❌ donation_id is missing from request body");
      return res.status(400).json({
        success: false,
        message: "donation_id is required"
      });
    }

    const result = await pool.query(
      `INSERT INTO food_donations (donation_id, food_type, expiration_date)
       VALUES ($1, $2, $3) RETURNING *`,
      [donation_id, category || "غير محدد", expiry_date || null]
    );
    console.log("✅ [POST /food_donations] Created:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ [POST /food_donations] Error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
});

app.post('/clothes_donations', async (req, res) => {
  const { donation_id, clothes_type } = req.body;

  if (!donation_id || !clothes_type) {
    return res.status(400).json({
      success: false,
      message: "donation_id and clothes_type are required"
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO clothes_donations (donation_id, clothes_type)
      VALUES ($1, $2)
      RETURNING *
      `,
      [donation_id, clothes_type]
    );

    res.json({
      success: true,
      item: result.rows[0]
    });
  } catch (err) {
    console.error("❌ clothes_donations error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
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
app.get('/donations/:id/association', async (req, res) => {
  const { id } = req.params;

  try {
    const q = await pool.query(
      `
      SELECT
        d.donation_id,
        a.association_id,
        a.name,
        acc.address
      FROM donations d
      JOIN associations a ON a.association_id = d.association_id
      JOIN users u ON u.user_id = a.user_id
      JOIN accounts acc ON acc.account_id = u.account_id
      WHERE d.donation_id = $1
      `,
      [id]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Association not found for this donation"
      });
    }

    res.json(q.rows[0]);
  } catch (e) {
    console.error("❌ GET donation association error:", e);
    res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

app.get('/donation_history/donor/:account_id', async (req, res) => {
  const { account_id } = req.params;

  try {
    const q = await pool.query(
      `
      SELECT DISTINCT ON (h.donation_id)
        h.donation_id,
        h.description,
        h.event_time,
        d.status,
        d.delivery_method,
        d.delivery_status
      FROM donation_history h
      JOIN donations d ON d.donation_id = h.donation_id
      JOIN donors dr ON dr.user_id = h.donor_id
      JOIN users u ON u.user_id = dr.user_id
      WHERE u.account_id = $1
      ORDER BY h.donation_id, h.event_time DESC
      `,
      [account_id]
    );

    res.json(q.rows);
  } catch (e) {
    console.error("❌ donation_history error:", e);
    res.status(500).json({ ok:false });
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

app.post('/admin/add-delivery-person', async (req, res) => {
  const {
    username,
    password,
    full_name,
    phone,
    email,
    car_type
  } = req.body;

  // ===== Validation =====
  if (!username || !password || !phone || !car_type) {
    return res.status(400).json({
      ok: false,
      error: "Missing required fields"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ===== 1️⃣ Check if username or phone exists =====
    const exists = await client.query(
      `SELECT 1 FROM accounts WHERE username = $1 OR phone = $2`,
      [username, phone]
    );

    if (exists.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.json({
        ok: false,
        error: "Username or phone already exists"
      });
    }

    // ===== 2️⃣ Create account (APPROVED مباشرة) =====
    // ===== 2️⃣ Create account (APPROVED + EMAIL VERIFIED مباشرة) =====
const hashedPassword = await bcrypt.hash(password, 10);

const accRes = await client.query(
  `
  INSERT INTO accounts
    (
      username,
      password_hash,
      role,
      email,
      phone,
      full_name,
      is_approved,
      email_verified
    )
  VALUES
    (
      $1,
      $2,
      'delivery',
      $3,
      $4,
      $5,
      true,
      true
    )
  RETURNING account_id
  `,
  [
    username,
    hashedPassword,
    email || null,
    phone,
    full_name || null
  ]
);

    const account_id = accRes.rows[0].account_id;

    // ===== 3️⃣ Create user =====
    const userRes = await client.query(
      `
      INSERT INTO users (account_id)
      VALUES ($1)
      RETURNING user_id
      `,
      [account_id]
    );

    const user_id = userRes.rows[0].user_id;

    // ===== 4️⃣ Create delivery person (association_id = NULL) =====
    const dpRes = await client.query(
      `
      INSERT INTO delivery_persons
        (user_id, status, name, phone_number, car_type, association_id)
      VALUES
        ($1, 'active', $2, $3, $4, NULL)
      RETURNING *
      `,
      [
        user_id,
        full_name || username,
        phone,
        car_type
      ]
    );

    if (dpRes.rows.length === 0) {
      throw new Error("Delivery person insert failed");
    }

    // ===== 5️⃣ Commit =====
    await client.query("COMMIT");

    console.log("✅ DELIVERY PERSON CREATED:", dpRes.rows[0]);

    res.json({
      ok: true,
      message: "Delivery person created successfully",
      delivery_person: dpRes.rows[0]
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ ADD DELIVERY PERSON ERROR:", error);

    res.status(500).json({
      ok: false,
      error: "Failed to create delivery person"
    });
  } finally {
    client.release();
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
  let { donation_type, donor_id, account_id, location } = req.query;

  try {
    // If account_id is provided instead of donor_id, convert it to donor_id
    if (account_id && !donor_id) {
      const userRes = await pool.query(
        `SELECT u.user_id FROM users u WHERE u.account_id = $1`,
        [account_id]
      );
      if (userRes.rows.length > 0) {
        donor_id = userRes.rows[0].user_id;
        console.log("🔄 [RECOMMEND] Converted account_id to donor_id:", donor_id);
      }
    }

    console.log("📊 [RECOMMEND] Called with:", { donation_type, donor_id, account_id, location });

    // 1️⃣ Get Active Request Donations (PRIORITY)
    let requestDonations = [];
    if (donation_type) {
      const requestQuery = `
      SELECT DISTINCT
        rd.request_id,
        rd.association_id,
        rd.donation_type,
        rd.description,
        rd.created_at,
        rd.status,
        a.name as association_name,
        a.description as association_description,
        acc.address
      FROM request_donations rd
      JOIN associations a ON rd.association_id = a.association_id
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN accounts acc ON acc.account_id = u.account_id
      WHERE 
        LOWER(rd.donation_type) = LOWER($1)
        AND UPPER(rd.status) IN ('ACTIVE', 'PENDING')
      ORDER BY rd.created_at DESC
      LIMIT 10
    `;
      const requestResult = await pool.query(requestQuery, [donation_type]);
      requestDonations = requestResult.rows.map(r => ({
        ...r,
        type: 'request',
        priority: 'urgent'
      }));
      console.log("📬 [RECOMMEND] Found", requestDonations.length, "active requests");
    }

    // 2️⃣ Get Donor's Donation History (to suggest same types they donated before)
    let preferredTypes = [donation_type];
    if (donor_id) {
      const historyQuery = `
        SELECT DISTINCT donation_type, COUNT(*) as count
        FROM donations
        WHERE donor_id = $1
        GROUP BY donation_type
        ORDER BY count DESC
      `;
      const historyResult = await pool.query(historyQuery, [donor_id]);
      const donationTypes = historyResult.rows.map(r => r.donation_type);
      preferredTypes = [...new Set([donation_type, ...donationTypes])];
      console.log("📜 [RECOMMEND] Donor's preferred types:", preferredTypes);
    }

    // 3️⃣ Get Matching Associations
    let associationsQuery = `
      SELECT 
        a.association_id,
        a.name,
        a.description,
        acc.address,
        COUNT(DISTINCT d.donation_id) as total_donations_received
      FROM associations a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN accounts acc ON acc.account_id = u.account_id
      LEFT JOIN donations d ON d.association_id = a.association_id AND (d.delivery_status = 'DELIVERED' OR d.delivery_status IS NULL)
      WHERE 1 = 1
    `;

    const params = [];

    // Only filter by donation type if columns exist and have values
    if (donation_type === "food") {
      associationsQuery += " AND (a.food = true OR a.food IS NOT FALSE)";
    } else if (donation_type === "clothes") {
      associationsQuery += " AND (a.clothes = true OR a.clothes IS NOT FALSE)";
    }

    if (location) {
      associationsQuery += ` AND (acc.address ILIKE $${params.length + 1} OR a.name ILIKE $${params.length + 1})`;
      params.push(`%${location}%`);
    }

    associationsQuery += `
      GROUP BY a.association_id, a.name, a.description, acc.address
      ORDER BY total_donations_received DESC
      LIMIT 15
    `;

    console.log("🔍 [RECOMMEND] Query:", associationsQuery);
    console.log("📊 [RECOMMEND] Params:", params);
    
    const associationsResult = await pool.query(associationsQuery, params);
    const associations = associationsResult.rows.map(a => ({
      ...a,
      type: 'association',
      priority: 'standard'
    }));
    console.log("🏢 [RECOMMEND] Found", associations.length, "matching associations");

    // 4️⃣ Get Donor History
    let donationHistory = [];
    if (donor_id) {
      const historyResult = await pool.query(
        `SELECT d.donation_id, d.donor_id, d.donation_type, d.status, d.created_at,
                fd.food_type, fd.expiration_date,
                cd.clothes_type
         FROM donations d
         LEFT JOIN food_donations fd ON d.donation_id = fd.donation_id
         LEFT JOIN clothes_donations cd ON d.donation_id = cd.donation_id
         WHERE d.donor_id = $1
         ORDER BY d.created_at DESC
         LIMIT 10`,
        [donor_id]
      );
      donationHistory = historyResult.rows;
      console.log("📝 [RECOMMEND] Donor's donation history:", donationHistory.length, "donations");
    }

    // 5️⃣ Combine Results (Requests first as priority, then associations)
    const combined = [
      ...requestDonations,
      ...associations
    ];

    res.json({
      success: true,
      data: {
        prioritized_requests: requestDonations,
        associations: associations,
        all_recommendations: combined,
        donor_history: donationHistory,
        donor_preferred_types: preferredTypes
      }
    });

  } catch (error) {
    console.error("❌ [RECOMMEND] API Error:", error);
    res.status(500).json({ success: false, error: "Server error", details: error.message });
  }
});
app.get('/donations/clothes/pending', async (req, res) => {
  const { association_id } = req.query;

  try {
    let query = `
      SELECT
        d.donation_id,
        COALESCE(a.full_name, 'Donor') AS donor_name,
        d.item_image,
        d.note,
        d.status,
        d.created_at,
        d.delivery_method,
        d.delivery_status,
        d.delivery_person_id
      FROM donations d
      JOIN donors dr   ON dr.user_id = d.donor_id
      JOIN users u     ON u.user_id  = dr.user_id
      JOIN accounts a  ON a.account_id = u.account_id
      LEFT JOIN clothes_donations cd ON cd.donation_id = d.donation_id
      WHERE d.donation_type = 'clothes'
        AND d.status = 'pending'
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
    res.status(500).json({ ok:false, error:'Failed to fetch pending clothes donations' });
  }
});

app.get('/assoc/delivery-persons', async (req, res) => {
  const { association_id } = req.query;

  try {
    const q = await pool.query(`
      SELECT
        dp.delivery_person_id,
        dp.status,
        dp.car_type,
        COALESCE(acc.full_name, dp.name) AS name,
        COALESCE(acc.phone, dp.phone_number) AS phone,
        acc.email,
        dp.association_id

      FROM delivery_persons dp
      JOIN users u ON u.user_id = dp.user_id
      JOIN accounts acc ON acc.account_id = u.account_id

      WHERE acc.is_approved = true

        -- 🔒 لا يظهر إذا مربوط بجمعية ثانية
        AND (
          dp.association_id IS NULL
          OR dp.association_id = $1
        )

        -- 🚫 لا يكون ماسك طلب فعال
        AND dp.delivery_person_id NOT IN (
          SELECT delivery_person_id
          FROM donations
          WHERE delivery_person_id IS NOT NULL
            AND delivery_status IN ('ASSIGNED', 'PICKED_UP')
        )

      ORDER BY dp.delivery_person_id DESC
    `, [association_id || null]);

    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch delivery persons'
    });
  }
});


app.post('/assoc/donations/:id/accept', async (req, res) => {
  const id = req.params.id;
  const message = req.body?.message || null;

  console.log('🔵 Accept donation request:', { id, message });

  try {
    // 1️⃣ Get donation
    const d = await pool.query(
      `SELECT donation_id, donor_id, delivery_method
       FROM donations
       WHERE donation_id = $1`,
      [id]
    );

    console.log('✅ Donation query result:', d.rows);

    if (d.rows.length === 0) {
      return res.status(404).json({ ok:false, error:'Donation not found' });
    }

    const donation = d.rows[0];
    const method = donation.delivery_method || 'donor';
    const deliveryStatus = (method === 'association') ? 'NEEDS_ASSIGNMENT' : 'WAITING_FOR_DONOR';

    console.log('📦 Donation:', donation, 'Method:', method, 'Status:', deliveryStatus);

    // 2️⃣ Update donation status
    const updateRes = await pool.query(
      `UPDATE donations
       SET status='accepted',
           delivery_status=$2
       WHERE donation_id=$1`,
      [id, deliveryStatus]
    );

    console.log('✅ Update donation result:', updateRes.rowCount, 'rows updated');

    // 3️⃣ Add to donation history
    const historyRes = await pool.query(
      `INSERT INTO donation_history (donation_id, donor_id, description)
       VALUES ($1, $2, 'ACCEPTED')`,
      [id, donation.donor_id]
    );

    console.log('✅ History insert result:', historyRes.rowCount, 'rows inserted');

    // 4️⃣ Send notification to donor (optional)
    if (donation.donor_id) {
      try {
        const notificationMessage = JSON.stringify({
          text: message || (method === 'association'
            ? 'تم قبول تبرعك وسيتم استلامه بأقرب وقت، يمكنك تتبع الطلب'
            : 'تم قبول طلبك، يمكنك إيصال التبرع إلى عنوان الجمعية'),
          donation_id: id,
          delivery_method: method
        });

        const notifRes = await pool.query(
          `INSERT INTO notifications (user_id, type, message)
           SELECT u.user_id, 'donation_accepted', $1
           FROM donors d
           JOIN users u ON u.user_id = d.user_id
           WHERE d.user_id = $2`,
          [notificationMessage, donation.donor_id]
        );

        console.log('✅ Notification insert result:', notifRes.rowCount, 'rows inserted');
      } catch (notifError) {
        console.warn('⚠️ Notification error (non-critical):', notifError.message);
      }
    }

    console.log('✅ Accept successful!');
    res.json({ ok:true, donation_id:Number(id), delivery_method:method, delivery_status:deliveryStatus });
    
  } catch (e) {
    console.error('❌ Accept donation error:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ ok:false, error:'Failed to accept donation', details: e.message });
  }
});
app.post('/assoc/donations/:id/assign-delivery', async (req, res) => {
  const donationId = req.params.id;
  const { delivery_person_id } = req.body;

  if (!delivery_person_id)
    return res.status(400).json({ ok:false, error:'delivery_person_id required' });

  try {
    // 1️⃣ get donation
    const d = await pool.query(
      `SELECT donation_id, status, delivery_method, association_id
       FROM donations
       WHERE donation_id=$1`,
      [donationId]
    );

    if (d.rows.length === 0)
      return res.status(404).json({ ok:false, error:'Donation not found' });

    const row = d.rows[0];

    if (row.status !== 'accepted')
      return res.status(400).json({ ok:false, error:'Donation not accepted' });

    if ((row.delivery_method || 'donor') !== 'association')
      return res.status(400).json({ ok:false, error:'Delivery method is not association' });

    // 2️⃣ check delivery person (ONLY approved)
    const dp = await pool.query(`
      SELECT dp.delivery_person_id
      FROM delivery_persons dp
      JOIN users u ON u.user_id = dp.user_id
      JOIN accounts acc ON acc.account_id = u.account_id
      WHERE dp.delivery_person_id=$1
        AND acc.is_approved=true
    `, [delivery_person_id]);



    if (dp.rows.length === 0)
      return res.status(400).json({ ok:false, error:'Delivery person not approved' });

    // 3️⃣ ASSIGN donation
    await pool.query(
      `UPDATE donations
       SET delivery_person_id=$2,
           delivery_status='ASSIGNED'
       WHERE donation_id=$1`,
      [donationId, delivery_person_id]
    );
    // ===== 📧 Send email to delivery person =====
const emailRes = await pool.query(`
  SELECT acc.email, acc.full_name
  FROM delivery_persons dp
  JOIN users u ON u.user_id = dp.user_id
  JOIN accounts acc ON acc.account_id = u.account_id
  WHERE dp.delivery_person_id = $1
`, [delivery_person_id]);

if (emailRes.rows.length > 0) {
  const { email, full_name } = emailRes.rows[0];

  await sendEmail(
    email,
    "🚚 New Delivery Assigned – Zaad Platform",
    `
    <div style="font-family: Arial; direction: rtl">
      <h2>مرحباً ${full_name} 👋</h2>
      <p>تم تعيين طلب توصيل جديد لك على منصة <b>زاد</b>.</p>
      <p>يرجى تسجيل الدخول إلى التطبيق للاطلاع على التفاصيل.</p>
      <br/>
      <p>بالتوفيق 🤍<br/>فريق زاد</p>
    </div>
    `
  );
} 
    await pool.query(
      `UPDATE delivery_persons
       SET association_id=$2
       WHERE delivery_person_id=$1`,
      [delivery_person_id, row.association_id]
    );

    // 5️⃣ optional sync table
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
app.get('/delivery/my-donations/:delivery_person_id', async (req, res) => {
  const { delivery_person_id } = req.params;

  try {
    const q = await pool.query(`
      SELECT
        d.donation_id,
        d.delivery_status,
        d.address AS donation_address,
        d.delivery_method,
        d.created_at,

        acc.full_name AS donor_name,
        acc.phone AS donor_phone,

        a.name AS association_name,
        acc2.address AS association_address

      FROM donations d
      JOIN donors dr ON dr.user_id = d.donor_id
      JOIN users u1 ON u1.user_id = dr.user_id
      JOIN accounts acc ON acc.account_id = u1.account_id

      LEFT JOIN associations a ON a.association_id = d.association_id
      LEFT JOIN users u2 ON u2.user_id = a.user_id
      LEFT JOIN accounts acc2 ON acc2.account_id = u2.account_id

      WHERE d.delivery_person_id = $1
        AND d.delivery_status IS NOT NULL

      ORDER BY d.created_at DESC
    `, [delivery_person_id]);

    res.json({ ok: true, donations: q.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false });
  }
});
app.post("/delivery/feedback", async (req, res) => {
  const { donation_id, message } = req.body;

  if (!donation_id || !message) {
    return res.status(400).json({ ok: false });
  }

  try {
    // 1️⃣ get donor
    const q = await pool.query(
      `
      SELECT d.donor_id, u.user_id
      FROM donations d
      JOIN donors dr ON dr.user_id = d.donor_id
      JOIN users u ON u.user_id = dr.user_id
      WHERE d.donation_id = $1
      `,
      [donation_id]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ ok: false });
    }

    const donorId = q.rows[0].donor_id;
    const donorUserId = q.rows[0].user_id;

    // 2️⃣ save feedback
    await pool.query(
      `
      INSERT INTO feedbacks (donor_id, message, status)
      VALUES ($1, $2, 'DELIVERY_FEEDBACK')
      `,
      [donorId, message]
    );

    // 3️⃣ notification (✨ المهم)
    const notif = JSON.stringify({
      text: message,          // 👈 نص الفيدباك نفسه
      donation_id,
      kind: "feedback",       // 👈 لتمييزه عن tracking
    });

    await pool.query(
      `
      INSERT INTO notifications (user_id, type, message)
      VALUES ($1, 'delivery_feedback', $2)
      `,
      [donorUserId, notif]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});
app.get('/notifications/unread-count/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    const q = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE user_id = $1
        AND is_read = false
      `,
      [user_id]
    );

    res.json({
      ok: true,
      count: Number(q.rows[0].count),
    });
  } catch (e) {
    console.error("❌ unread-count error:", e);
    res.status(500).json({
      ok: false,
      count: 0,
    });
  }
});


app.post('/delivery/update-status', async (req, res) => {
  const { donation_id, next_status } = req.body;

  if (!donation_id || !next_status)
    return res.status(400).json({ ok:false });

  try {
    await pool.query(`
      UPDATE donations
      SET delivery_status = $2,
          delivered_at = CASE WHEN $2 = 'DELIVERED' THEN NOW() ELSE delivered_at END
      WHERE donation_id = $1
    `, [donation_id, next_status]);

    await pool.query(`
      INSERT INTO donation_history (donation_id, description)
      VALUES ($1, $2)
    `, [donation_id, next_status]);

    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false });
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
             d.delivery_person_id,
             COALESCE(dp.name,'') AS delivery_person_name

      FROM donations d
      JOIN donors dr   ON dr.user_id = d.donor_id
      JOIN users u     ON u.user_id  = dr.user_id
      JOIN accounts a  ON a.account_id = u.account_id
      JOIN clothes_donations cd ON cd.donation_id = d.donation_id
      LEFT JOIN delivery_persons dp ON dp.delivery_person_id = d.delivery_person_id

      WHERE d.donation_type = 'clothes'
        AND d.status = 'accepted'
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

// POST /assoc/donations/:id/approve  -> accepted ➜ approved (without notification, notification already sent in accept)
app.post('/assoc/donations/:id/approve', async (req, res) => {
  const donationId = req.params.id;

  try {
    const d = await pool.query(
      `
      SELECT donation_id, donor_id, delivery_method, delivery_status
      FROM donations
      WHERE donation_id = $1
      `,
      [donationId]
    );

    if (d.rows.length === 0)
      return res.status(404).json({ ok: false, error: "Donation not found" });

    const donation = d.rows[0];
    const method = donation.delivery_method || 'donor';

    let nextDeliveryStatus =
      method === 'association'
        ? 'NEEDS_ASSIGNMENT'
        : 'WAITING_FOR_DONOR';

    // 1️⃣ Update donation
    await pool.query(
      `
      UPDATE donations
      SET status = 'approved',
          delivery_status = $2
      WHERE donation_id = $1
      `,
      [donationId, nextDeliveryStatus]
    );

    // 2️⃣ Donation history
    await pool.query(
      `
      INSERT INTO donation_history (donation_id, donor_id, description)
      VALUES ($1, $2, 'APPROVED')
      `,
      [donationId, donation.donor_id]
    );

    res.json({
      ok: true,
      delivery_status: nextDeliveryStatus
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

// POST /assoc/notify-donor - Send custom message to donor
app.post('/assoc/notify-donor', async (req, res) => {
  const { donation_id, message } = req.body;

  if (!donation_id || !message) {
    return res.status(400).json({ ok: false, error: 'donation_id and message are required' });
  }

  try {
    // Get donor_id from donation
    const d = await pool.query(
      `SELECT donor_id FROM donations WHERE donation_id = $1`,
      [donation_id]
    );

    if (d.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Donation not found' });
    }

    const donor_id = d.rows[0].donor_id;

    // Send notification to donor
    const notificationMessage = JSON.stringify({
      text: message,
      donation_id: donation_id
    });

    await pool.query(
      `INSERT INTO notifications (user_id, type, message)
       SELECT u.user_id, 'donation_message', $2
       FROM donors d
       JOIN users u ON u.user_id = d.user_id
       WHERE d.user_id = $1`,
      [donor_id, notificationMessage]
    );

    res.json({ ok: true, message: 'Notification sent to donor' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Failed to send notification' });
  }
});

app.post('/donor/deliver', async (req, res) => {
  const { donation_id } = req.body;

  if (!donation_id)
    return res.status(400).json({ ok:false });

  try {
    await pool.query(
      `
      UPDATE donations
      SET delivery_status = 'DELIVERED',
          delivered_at = NOW()
      WHERE donation_id = $1
      `,
      [donation_id]
    );

    await pool.query(
      `
      INSERT INTO donation_history (donation_id, description)
      VALUES ($1, 'DELIVERED_BY_DONOR')
      `,
      [donation_id]
    );

    res.json({ ok:true });

  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false });
  }
});
app.get('/notifications/:account_id', async (req, res) => {
  const { account_id } = req.params;

  try {
    const q = await pool.query(
      `
      SELECT n.*
      FROM notifications n
      JOIN users u ON u.user_id = n.user_id
      WHERE u.account_id = $1
      ORDER BY n.created_at DESC
      `,
      [account_id]
    );

    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

// MARK notification as read
app.post('/notifications/read/:notification_id', async (req, res) => {
  const { notification_id } = req.params;

  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE notification_id = $1`,
      [notification_id]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false });
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

        fs.unlinkSync(file.path);
      }

      /* =========================
         EARLY RETURN: Image passed cooked & damage checks
         User will manually scan barcode next, then check expiry
      ========================= */
      console.log(`\n========== PASSED INITIAL CHECKS ==========`);
      console.log(`[STATUS] ✅ Image is packaged and undamaged`);
      console.log(`[NEXT] User will scan barcode manually`);
      console.log(`==============================================\n`);

      res.json({
        success: true,
        passed_checks: true,
        result: "✅ المنتج آمن – يرجى مسح الباركود",
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
// EXPIRY CHECK ENDPOINT - After barcode scan
// =======================
app.post(
  "/ai/check-expiry",
  upload.array("images", 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Images are required"
        });
      }

      let expiryDates = [];
      let detectedTexts = [];

      for (const file of req.files) {
        console.log(`\n[IMAGE-EXPIRY] Processing: ${file.originalname}`);

        /* =========================
           OCR – extract text for expiry
        ========================= */
        console.log(`[OCR] Extracting text for expiry date...`);
        const [ocrResult] = await visionClient.textDetection(file.path);
        const detectedText =
          ocrResult.fullTextAnnotation?.text.toLowerCase() || "";
        console.log(`[OCR] Text: "${detectedText.substring(0, 60)}${detectedText.length > 60 ? '...' : ''}"`);

        detectedTexts.push(detectedText);

        /* =========================
           EXPIRY DATE DETECTION
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
         FINAL EXPIRY DECISION
      ========================= */
      console.log(`\n========== EXPIRY CHECK RESULT ==========`);
      
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
      console.error("AI Expiry Check Error:", error);
      res.status(500).json({
        success: false,
        message: "Expiry check failed"
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
      ADD COLUMN IF NOT EXISTS user_id INTEGER;
    `);

    // أضف FK فقط (بدون UNIQUE)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_delivery_persons_user'
        ) THEN
          ALTER TABLE delivery_persons
          ADD CONSTRAINT fk_delivery_persons_user
          FOREIGN KEY (user_id)
          REFERENCES users(user_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    console.log("✅ delivery_persons.user_id added correctly (NO UNIQUE)");
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
    
    // Create new table WITH FK constraint
    const query = `
      CREATE TABLE IF NOT EXISTS request_donations (
        request_id SERIAL PRIMARY KEY,
        association_id INT NOT NULL,
        donation_type VARCHAR(30),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        CONSTRAINT fk_request_donations_association
        FOREIGN KEY (association_id)
        REFERENCES associations(association_id)
        ON DELETE CASCADE
      );
    `;
    await pool.query(query);
    console.log("✅ Table request_donations recreated successfully WITH FK constraint");
  } catch (err) {
    console.error("❌ Error creating request_donations table:", err);
  }
}
createRequestDonationsTable();


app.post('/assoc/request-donation', async (req, res) => {
  try {
    const { association_id, donation_type, description } = req.body;

    console.log('📝 POST /assoc/request-donation - Received:', {
      association_id,
      donation_type,
      description
    });

    const assocCheck = await pool.query(
      `SELECT association_id FROM associations WHERE association_id = $1`,
      [association_id]
    );

    if (assocCheck.rows.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Association not found"
      });
    }

    // 2️⃣ إنشاء الطلب
    const result = await pool.query(
      `
      INSERT INTO request_donations 
        (association_id, donation_type, description)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [association_id, donation_type, description]
    );

    const request = result.rows[0];
    console.log('✅ Request created:', request);

    // 3️⃣ جلب كل donors
    const donors = await pool.query(`
      SELECT u.user_id
      FROM donors d
      JOIN users u ON u.user_id = d.user_id
    `);

    // 4️⃣ إرسال notification لكل donor
    for (const donor of donors.rows) {
      const notif = JSON.stringify({
        text: "📢 جمعية بحاجة لتبرعات عاجلة",
        kind: "association_request",
        association_id,
        request_id: request.request_id,
        donation_type,
        description
      });

      await pool.query(
        `
        INSERT INTO notifications (user_id, type, message)
        VALUES ($1, 'association_request', $2)
        `,
        [donor.user_id, notif]
      );
    }

    res.status(201).json({
      ok: true,
      message: "Request added and notifications sent",
      data: request
    });

  } catch (error) {
    console.error('❌ Request creation error:', error);
    res.status(500).json({
      ok: false,
      error: "Server error"
    });
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


// ===== PRODUCTS TABLE CREATION =====
async function createProductsTable() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        barcode VARCHAR(32) UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT
      );
    `;
    await pool.query(query);
    console.log("✅ Table products created/verified successfully");
  } catch (err) {
    console.error("❌ Error creating products table:", err);
  }
}
createProductsTable();

// ===== PRODUCTS ENDPOINTS =====

// GET all products
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json({ success: true, products: result.rows });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET product by barcode
app.get('/products/:barcode', async (req, res) => {
  const { barcode } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE barcode = $1',
      [barcode]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST endpoint to check barcode and get category via OCR fallback
app.post('/products/lookup-with-ocr', upload.single('image'), async (req, res) => {
  const { barcode } = req.body;
  const file = req.file;

  try {
    // 1️⃣ Check if barcode exists in products table
    if (barcode) {
      const productRes = await pool.query(
        'SELECT * FROM products WHERE barcode = $1',
        [barcode]
      );
      
      if (productRes.rows.length > 0) {
        console.log(`[BARCODE-FOUND] Product found: ${productRes.rows[0].name}`);
        if (file) fs.unlinkSync(file.path);
        return res.json({
          success: true,
          found: true,
          product: productRes.rows[0],
          source: 'barcode'
        });
      }
    }

    // 2️⃣ If barcode not found, try OCR for category detection
    console.log(`[BARCODE] Not found, falling back to OCR...`);
    
    if (!file) {
      return res.json({
        success: false,
        found: false,
        message: 'Barcode not found. Please provide image for OCR fallback.'
      });
    }

    const [ocrResult] = await visionClient.textDetection(file.path);
    const detectedText = ocrResult.fullTextAnnotation?.text.toLowerCase() || "";

    let categoryFromOCR = null;

    // Text-based category detection
    if (detectedText.includes("bread") || detectedText.includes("toast") || 
        detectedText.includes("خبز") || detectedText.includes("توست"))
      categoryFromOCR = "خبز ومخبوزات";
    else if (detectedText.includes("flour") || detectedText.includes("wheat"))
      categoryFromOCR = "طحين وحبوب";
    else if (detectedText.includes("rice")) categoryFromOCR = "رز";
    else if (detectedText.includes("pasta")) categoryFromOCR = "معكرونة";
    else if (detectedText.includes("sugar")) categoryFromOCR = "سكر";
    else if (detectedText.includes("bean") || detectedText.includes("lentil") || 
             detectedText.includes("chickpea"))
      categoryFromOCR = "بقوليات";
    else if (detectedText.includes("oil")) categoryFromOCR = "زيوت";
    else if (detectedText.includes("tuna")) categoryFromOCR = "معلبات سمك";

    // Fallback to image labels if no text match
    if (!categoryFromOCR || !hasUsefulText(detectedText)) {
      const [labelResult] = await visionClient.labelDetection(file.path);
      const labels = labelResult.labelAnnotations?.map(l =>
        l.description.toLowerCase()
      ) || [];

      for (const label of labels) {
        const mapped = mapVisionLabelToCategory(label);
        if (mapped) {
          categoryFromOCR = mapped;
          break;
        }
      }
    }

    if (!categoryFromOCR) categoryFromOCR = "مواد غذائية";

    console.log(`[OCR] Category detected: ${categoryFromOCR}`);
    fs.unlinkSync(file.path);

    res.json({
      success: true,
      found: false,
      category: categoryFromOCR,
      source: 'ocr'
    });

  } catch (err) {
    console.error('Error in barcode lookup:', err);
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST/UPSERT product (insert or update if barcode exists)
app.post('/products', async (req, res) => {
  const { barcode, name, category } = req.body;

  if (!barcode || !name) {
    return res.status(400).json({
      success: false,
      message: "Barcode and name are required"
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO products (barcode, name, category)
      VALUES ($1, $2, $3)
      ON CONFLICT (barcode)
      DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category
      RETURNING *
      `,
      [barcode, name, category]
    );

    res.json({
      success: true,
      message: "Product saved successfully",
      product: result.rows[0]
    });
  } catch (err) {
    console.error('Error saving product:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE product by id
app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});
// ===== RATINGS TABLE CREATION =====
async function createRatingsTable() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS ratings (
        rating_id SERIAL PRIMARY KEY,
        donation_id INT UNIQUE NOT NULL,
        donor_id INT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);

    // 🔒 FK constraints (optional but recommended)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_ratings_donation'
        ) THEN
          ALTER TABLE ratings
          ADD CONSTRAINT fk_ratings_donation
          FOREIGN KEY (donation_id)
          REFERENCES donations(donation_id)
          ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_ratings_donor'
        ) THEN
          ALTER TABLE ratings
          ADD CONSTRAINT fk_ratings_donor
          FOREIGN KEY (donor_id)
          REFERENCES donors(user_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // ✅ add helper column on donations (so frontend can quickly know)
    await pool.query(`
      ALTER TABLE donations
      ADD COLUMN IF NOT EXISTS is_rated BOOLEAN DEFAULT FALSE;
    `);

    console.log("✅ Table ratings created/verified successfully");
  } catch (err) {
    console.error("❌ Error creating ratings table:", err);
  }
}
createRatingsTable();

// ===== RATINGS ENDPOINTS =====

// POST /donations/:id/rate  -> donor rates donation experience
app.post("/donations/:id/rate", async (req, res) => {
  const donationId = Number(req.params.id);
  const { donor_id, rating, comment } = req.body;

  console.log("🌟 [RATING] Request received:", { donationId, donor_id, rating });

  if (!donationId || !donor_id || !rating) {
    return res.status(400).json({
      ok: false,
      message: "donationId, donor_id, rating are required"
    });
  }

  const intRating = Number(rating);
  if (!Number.isInteger(intRating) || intRating < 1 || intRating > 5) {
    return res.status(400).json({
      ok: false,
      message: "rating must be an integer between 1 and 5"
    });
  }

  try {
    // 1️⃣ Verify donation exists + belongs to donor + delivered
    const d = await pool.query(
      `
      SELECT donation_id, donor_id, delivery_status, is_rated
      FROM donations
      WHERE donation_id = $1
      `,
      [donationId]
    );

    console.log("📊 [RATING] DB donation:", d.rows[0]);

    if (d.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Donation not found" });
    }

    const donation = d.rows[0];
    console.log("🔍 [RATING] Comparing donor_id:", {
      received: donor_id,
      inDB: donation.donor_id,
      type_received: typeof donor_id,
      type_db: typeof donation.donor_id
    });

    if (Number(donation.donor_id) !== Number(donor_id)) {
      console.log("❌ [RATING] Donor mismatch!");
      return res.status(403).json({
        ok: false,
        message: `You can only rate your own donation (DB: ${donation.donor_id}, Sent: ${donor_id})`
      });
    }

    if ((donation.delivery_status || "") !== "DELIVERED") {
      return res.status(400).json({
        ok: false,
        message: `You can rate only after donation is DELIVERED (Current: ${donation.delivery_status})`
      });
    }

    if (donation.is_rated) {
      return res.status(409).json({
        ok: false,
        message: "This donation has already been rated"
      });
    }

    // 2️⃣ Insert rating
    const ins = await pool.query(
      `
      INSERT INTO ratings (donation_id, donor_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [donationId, donor_id, intRating, (comment || "").trim() || null]
    );

    // 3️⃣ Mark donation rated
    await pool.query(
      `UPDATE donations SET is_rated = TRUE WHERE donation_id = $1`,
      [donationId]
    );
    await pool.query(
      `
      INSERT INTO donation_history (donation_id, donor_id, description)
      VALUES ($1, $2, 'RATED')
      `,
      [donationId, donor_id]
    );

    console.log("✅ [RATING] Success!");
    res.status(201).json({
      ok: true,
      message: "Rating submitted successfully",
      rating: ins.rows[0]
    });
  } catch (err) {
    console.error("❌ RATE DONATION ERROR:", err);
    res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
});
// GET /donations/:id/rating-status -> check if donation already rated
app.get("/donations/:id/rating-status", async (req, res) => {
  const donationId = Number(req.params.id);

  try {
    const q = await pool.query(
      `
      SELECT d.donation_id, d.donor_id, d.is_rated, d.delivery_status,
             r.rating, r.comment, r.created_at
      FROM donations d
      LEFT JOIN ratings r ON r.donation_id = d.donation_id
      WHERE d.donation_id = $1
      `,
      [donationId]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Donation not found" });
    }

    res.json({ ok: true, data: q.rows[0] });
  } catch (e) {
    console.error("❌ rating-status error:", e);
    res.status(500).json({ ok: false });
  }
});


// ...existing code...
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
