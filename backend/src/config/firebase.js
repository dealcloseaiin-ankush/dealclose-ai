const admin = require('firebase-admin');

// IMPORTANT: Replace this with your actual Firebase Admin SDK JSON configuration
const serviceAccount = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};

if (Object.keys(serviceAccount).length > 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin SDK initialized.');
} else {
  console.warn('Firebase Admin SDK not initialized. Please provide FIREBASE_CONFIG in .env');
}

module.exports = admin;
