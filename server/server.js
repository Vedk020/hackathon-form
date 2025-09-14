const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// --- Middleware ---
const corsOptions = {
  origin: 'https://hackandro.netlify.app/', // Only allow the deployed frontend
  optionsSuccessStatus: 200 
};
app.use(cors(corsOptions));
app.use(express.json());

// --- MongoDB Connection ---
// Only use the Render environment variable for the live database
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("FATAL ERROR: MONGO_URI is not set in the environment variables.");
  process.exit(1); // Exit the process if the database URI is not provided
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully."))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// --- Mongoose Schema (Unchanged) ---
const registrationSchema = new mongoose.Schema({
  teamName: { type: String, required: true, unique: true },
  headName: { type: String, required: true },
  headEmail: { type: String, required: true },
  password: { type: String, required: true },
  headRegNo: { type: String, required: true },
  contact: { type: String, required: true },
  altContact: { type: String },
  member1Name: { type: String, required: true },
  member1Reg: { type: String, required: true },
  member2Name: { type: String, required: true },
  member2Reg: { type: String, required: true },
  teamNumber: { type: String, required: true, unique: true },
  round2: { type: Boolean, default: false },
  certificateSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Registration = mongoose.model('Registration', registrationSchema);

// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
const otpStore = {}; // In-memory OTP storage

// --- API Routes ---

app.get('/api/registrations', async (req, res) => {
  try {
    const registrations = await Registration.find().sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching registrations', error });
  }
});

// --- Send OTP Endpoint ---
app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const otp = Math.floor(100000 + Math.random() * 90000).toString();
    otpStore[email] = { otp, timestamp: Date.now() };

    const mailOptions = {
        from: `Android Club VIT-AP <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Hackathon Registration OTP',
        text: `Your One-Time Password is: ${otp}. It is valid for 10 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Email send error:", error);
            return res.status(500).json({ message: 'Failed to send OTP. Check server credentials.' });
        }
        console.log('Email sent: ' + info.response);
        res.status(200).json({ message: 'OTP has been sent to your email.' });
    });
});

// --- Verify OTP Endpoint ---
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const storedOtpData = otpStore[email];
    if (storedOtpData && storedOtpData.otp === otp) {
        if (Date.now() - storedOtpData.timestamp > 10 * 60 * 1000) { // 10 minute expiry
            delete otpStore[email];
            return res.status(400).json({ message: 'OTP has expired.' });
        }
        delete otpStore[email];
        return res.status(200).json({ message: 'Email verified successfully.' });
    }
    return res.status(400).json({ message: 'Invalid OTP.' });
});

app.post('/api/registrations', async (req, res) => {
  try {
    const existingTeam = await Registration.findOne({ teamName: req.body.teamName });
    if (existingTeam) return res.status(400).json({ message: 'Team name already taken.' });

    let teamNumber;
    let isUnique = false;
    while (!isUnique) {
        teamNumber = "TEAM" + Math.floor(10000 + Math.random() * 90000);
        if (!(await Registration.findOne({ teamNumber }))) isUnique = true;
    }

    const newRegistration = new Registration({ ...req.body, teamNumber });
    await newRegistration.save();
    res.status(201).json(newRegistration);
  } catch (error) {
    console.error("SAVE ERROR:", error);
    res.status(500).json({ message: 'Error creating registration', error: error.message });
  }
});

app.patch('/api/registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRegistration = await Registration.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedRegistration) return res.status(404).json({ message: 'Registration not found' });
    res.json(updatedRegistration);
  } catch (error) {
    res.status(500).json({ message: 'Error updating registration', error });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port: ${PORT}`);
});

