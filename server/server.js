const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// --- Middleware ---
// Sirf deployed frontend ko allow karo
app.use(cors({ 
  origin: 'https://hackandro.netlify.app/', 
  optionsSuccessStatus: 200 
}));
app.use(express.json());

// --- MongoDB Connection ---
// Sirf Render env ke MONGO_URI par connect karo
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI not set in environment variables.");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully."))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// --- Mongoose Schema and Model ---
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

// --- API Routes ---
// GET all registrations
app.get('/api/registrations', async (req, res) => {
  try {
    const registrations = await Registration.find().sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching registrations', error });
  }
});

// POST a new registration
app.post('/api/registrations', async (req, res) => {
  try {
    const existingTeam = await Registration.findOne({ teamName: req.body.teamName });
    if (existingTeam) {
      return res.status(400).json({ message: 'Team name already taken.' });
    }

    let teamNumber;
    let isUnique = false;
    while (!isUnique) {
      teamNumber = "TEAM" + Math.floor(10000 + Math.random() * 90000);
      const existingNumber = await Registration.findOne({ teamNumber });
      if (!existingNumber) {
        isUnique = true;
      }
    }

    const newRegistration = new Registration({ ...req.body, teamNumber });
    await newRegistration.save();
    res.status(201).json(newRegistration);
  } catch (error) {
    console.error("SAVE ERROR:", error);
    res.status(500).json({ message: 'Error creating registration', error: error.message });
  }
});

// PATCH update registration
app.patch('/api/registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedRegistration = await Registration.findByIdAndUpdate(id, updates, { new: true });

    if (!updatedRegistration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    res.json(updatedRegistration);
  } catch (error) {
    res.status(500).json({ message: 'Error updating registration', error });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port: ${PORT}`);
});
