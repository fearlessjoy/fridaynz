const express = require('express');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Initialize Firebase Admin with environment variables or service account file
let adminConfig;

try {
  // First try to use environment variables
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    adminConfig = {
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      })
    };
  } else {
    // Fallback to service account file
    const serviceAccount = require('./service-account-key.json');
    adminConfig = {
      credential: admin.credential.cert(serviceAccount)
    };
  }

  admin.initializeApp(adminConfig);
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  // Continue running the server for email functionality
}

// Create email transporter with Titan Email SMTP settings
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Verify email configuration on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
}));

// Email notification endpoint
app.post('/api/send-notification', async (req, res) => {
  try {
    const { recipients, subject, content } = req.body;

    if (!recipients || !recipients.length || !subject || !content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: recipients, subject, or content'
      });
    }

    // Send email using the configured transporter
    await transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_USER}>`,
      to: recipients.join(', '),
      subject: subject,
      html: content
    });

    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send notification',
      error: error.message 
    });
  }
});

// Delete user endpoint using Admin SDK
app.post('/api/delete-user', async (req, res) => {
  try {
    if (!admin.apps.length) {
      return res.status(500).json({
        success: false,
        message: 'Firebase Admin SDK not initialized'
      });
    }

    const { userId, adminId } = req.body;

    // Get the admin user's custom claims
    const adminUser = await admin.auth().getUser(adminId);
    
    // Get the user's Firestore profile to check admin status
    const userRecord = await admin.firestore().collection('users').doc(adminId).get();
    const userData = userRecord.data();
    
    if (!userData || userData.userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized. Only admins can delete users.' 
      });
    }

    // Delete the user's auth account
    await admin.auth().deleteUser(userId);

    res.json({ 
      success: true, 
      message: 'User authentication account deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete user authentication account',
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 