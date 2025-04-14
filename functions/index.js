/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
require('dotenv').config();

admin.initializeApp();

// Create a nodemailer transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.titan.email',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // Use SSL/TLS
  auth: {
    user: process.env.SMTP_USER || 'jomy.joy@jobseekers.co.nz',
    pass: process.env.SMTP_PASS,
  },
});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.sendEmail = onDocumentCreated("mail/{mailId}", async (event) => {
  const mailData = event.data.data();
  
  try {
    // Send email using nodemailer
    await transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME || 'Restaurant Task Manager'} <${process.env.SMTP_USER || 'jomy.joy@jobseekers.co.nz'}>`,
      to: mailData.to.join(', '),
      subject: mailData.message.subject,
      html: mailData.message.html,
    });

    // Update the document to mark it as sent
    await event.data.ref.update({
      sent: true,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Email sent successfully to ${mailData.to.join(', ')}`);
    return null;
  } catch (error) {
    logger.error('Error sending email:', error);
    
    // Update the document to mark the error
    await event.data.ref.update({
      error: error.message,
      errorAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    throw error;
  }
});

exports.deleteUser = onRequest(async (request, response) => {
  // Enable CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    response.status(405).send({ message: 'Method Not Allowed' });
    return;
  }

  try {
    const { userId, adminId } = request.body;

    if (!userId || !adminId) {
      response.status(400).send({ message: 'Missing required fields: userId or adminId' });
      return;
    }

    // Verify admin status
    const adminDoc = await admin.firestore().collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      response.status(403).send({ message: 'Unauthorized: Requires admin privileges' });
      return;
    }

    // Delete the user's authentication account
    await admin.auth().deleteUser(userId);
    
    response.status(200).send({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Error in deleteUser function:', error);
    response.status(500).send({ message: error.message });
  }
});
