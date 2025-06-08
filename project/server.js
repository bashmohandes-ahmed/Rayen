const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

mongoose.connect('mongodb://localhost:27017/rayen-simple');

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: { type: String, enum: ['customer', 'seller'], default: 'customer' },
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' }
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  images: [String],
  video: String,
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const Order = mongoose.model('Order', orderSchema);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API لتسجيل مستخدم جديد
app.post('/api/signup', async (req, res) => {
  const { username, email, password, role } = req.body;
  const user = new User({ username, email, password, role });
  await user.save();
  res.json({ message: 'تم إنشاء الحساب بنجاح' });
});

// API لتسجيل الدخول (بسيط جدًا)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) res.json({ message: 'تم تسجيل الدخول', user });
  else res.status(401).json({ message: 'بيانات خاطئة' });
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));
