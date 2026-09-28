import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Enquiry from './models/Enquiry.js';
import Admin from './models/Admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;
const JWT_SECRET = process.env.JWT_SECRET || 'ahmed_facility_secret_jwt_key_2026';
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is missing in backend .env file!');
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log('🍃 Connected to MongoDB Atlas Database (AhmedFacility)'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

// ==========================================
// 1. PUBLIC ROUTES (Website Form Submissions)
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Submit an enquiry from the website
app.post('/api/enquiries', async (req, res) => {
  try {
    const { 
      fullName, 
      mobileNumber, 
      whatsappNumber, 
      emailAddress, 
      serviceRequired, 
      preferredDuration, 
      preferredStartDate, 
      additionalRequirements 
    } = req.body;

    if (!fullName || !mobileNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Client name and mobile number are required.' 
      });
    }

    // Generate human-friendly ID like ENQ-905
    const id = `ENQ-${Math.floor(100 + Math.random() * 900)}`;
    const createdAtFormatted = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newEnquiry = new Enquiry({
      id,
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      whatsappNumber: (whatsappNumber || mobileNumber).trim(),
      emailAddress: (emailAddress || '').trim(),
      serviceRequired: serviceRequired || 'General Service',
      preferredDuration: preferredDuration || 'Monthly',
      preferredStartDate: preferredStartDate || '',
      additionalRequirements: (additionalRequirements || '').trim(),
      status: 'New',
      createdAtFormatted
    });

    await newEnquiry.save();

    console.log(`[Enquiry Received] ${newEnquiry.id} from ${newEnquiry.fullName} (${newEnquiry.mobileNumber})`);

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully.',
      data: newEnquiry
    });
  } catch (error) {
    console.error('Error saving enquiry:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ==========================================
// 2. ADMIN AUTHENTICATION
// ==========================================

app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() });

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        title: admin.title
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Verify token / Current Admin Profile
app.get('/api/admin/me', authenticateToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found.' });
    }
    res.json({
      success: true,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone || '+974 4455 6677',
        title: admin.title || 'Operations Manager'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving profile.' });
  }
});

// Update Profile (Name, Email, Phone, Title)
app.put('/api/admin/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, title } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found.' });
    }

    // Check if email taken by other admin
    const emailConflict = await Admin.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: req.user.id }
    });
    if (emailConflict) {
      return res.status(400).json({ success: false, message: 'This email is already in use by another admin.' });
    }

    admin.name = name.trim();
    admin.email = email.trim().toLowerCase();
    if (phone) admin.phone = phone.trim();
    if (title) admin.title = title.trim();

    await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        title: admin.title
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// Change Password
app.put('/api/admin/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found.' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
});

// ==========================================
// 3. ADMIN ENQUIRY MANAGEMENT (Protected)
// ==========================================

// Get all enquiries
app.get('/api/admin/enquiries', authenticateToken, async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: enquiries.length,
      data: enquiries
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch enquiries.' });
  }
});

// Update enquiry status
app.patch('/api/admin/enquiries/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const enquiry = await Enquiry.findOne({ id });
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    enquiry.status = status;
    await enquiry.save();

    res.json({
      success: true,
      message: 'Status updated successfully.',
      data: enquiry
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
});

// Delete an enquiry
app.delete('/api/admin/enquiries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Enquiry.findOneAndDelete({ id });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    res.json({ success: true, message: 'Enquiry deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete enquiry.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ahmed for Facility Services Backend running on http://localhost:${PORT}`);
});
