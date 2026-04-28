require('dotenv').config();

// Fallback/Dummy key add kar rahe hain taaki agar real key na ho, toh server crash na ho
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'sk-dummy-key-to-prevent-startup-crash-123';
}

// Firebase ko temporarily comment kar diya hai taaki server bina error start ho sake
// require('./config/firebase'); 
const mongoose = require('mongoose');
const app = require('./app');

const port = process.env.PORT || 5000;

// Pehle server start kar dete hain taaki Render "No open ports" ka error na de
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Database connection error:', err);
});
