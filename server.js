// ======= RAYEN E-COMMERCE BACKEND IN ONE FILE WITH BUILT-IN ENV =======
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ===== إعدادات ثابتة =====
const SITE_NAME = "rayen";
const ADMIN_EMAIL = "ahmedusama77@icloud.com";
const NOTIFY_EMAIL = "ahmedusama77@icloud.com"; // بريد الإرسال (يفضل يكون Gmail)
const NOTIFY_EMAIL_PASSWORD = "app-password-here"; // ضع كلمة سر تطبيق Gmail هنا
const JWT_SECRET = 'supersecret';
const SERVER_URL = "http://localhost:5000";

// ===== إعدادات الإيميل (gmail فقط) =====
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: NOTIFY_EMAIL,
    pass: NOTIFY_EMAIL_PASSWORD
  }
});

// ===== إعدادات السيرفر =====
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ===== اتصال قاعدة البيانات =====
mongoose.connect('mongodb://localhost:27017/rayen', { useNewUrlParser: true, useUnifiedTopology: true });

// ===== النماذج =====
const userSchema = new mongoose.Schema({
  username: String, fullName: String, email: String, password: String,
  address: String, phone: String, role: { type: String, default: 'customer' },
  idCardImage: String, profileImage: String,
  sellerStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
});
const User = mongoose.model('User', userSchema);

const reviewSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, rating: Number, comment: String, createdAt: { type: Date, default: Date.now }
});
const productSchema = new mongoose.Schema({
  name: String, description: String, price: Number,
  images: [String], video: { type: String, required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, status: { type: String, default: 'waiting' },
  reviews: [reviewSchema], averageRating: { type: Number, default: 0 }
});
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quantity: { type: Number, default: 1 }, address: String,
  paymentMethod: { type: String, enum: ['cash', 'visa'] },
  status: { type: String, default: 'pending' }, createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// ===== ميدل وير التحقق من التوكن =====
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
  if (!token) return res.status(401).json({ message: 'برجاء تسجيل الدخول' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ message: 'مستخدم غير موجود' });
    next();
  } catch {
    res.status(401).json({ message: 'جلسة غير صالحة' });
  }
};
const requireRole = role => (req, res, next) => {
  if (req.user?.role !== role) return res.status(403).json({ message: 'غير مصرح' });
  next();
};

// ===== إعدادات رفع الملفات =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'idCardImage') cb(null, 'uploads/idcards/');
    else if (file.fieldname === 'profileImage') cb(null, 'uploads/profiles/');
    else if (file.fieldname === 'images') cb(null, 'uploads/products/images/');
    else if (file.fieldname === 'video') cb(null, 'uploads/products/videos/');
    else cb(null, 'uploads/other/');
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// ===== إرسال إيميل عند تسجيل تاجر =====
async function sendNewSellerEmail({ username, fullName, email, phone, idCardImage, profileImage }) {
  const message = `
    <h3>تم تسجيل تاجر جديد في ${SITE_NAME} ويحتاج موافقتك</h3>
    <ul>
      <li><b>اسم المستخدم:</b> ${username}</li>
      <li><b>الاسم بالكامل:</b> ${fullName}</li>
      <li><b>البريد:</b> ${email}</li>
      <li><b>رقم الهاتف:</b> ${phone}</li>
      <li><b>رابط صورة البطاقة:</b> <a href="${SERVER_URL}/${idCardImage}">صورة البطاقة</a></li>
      <li><b>رابط الصورة الشخصية:</b> <a href="${SERVER_URL}/${profileImage}">الصورة الشخصية</a></li>
    </ul>
    <img src="${SERVER_URL}/${profileImage}" width="150" />
    <img src="${SERVER_URL}/${idCardImage}" width="150" />
    <hr>
    <small>ادخل لوحة الإدارة للاعتماد أو الرفض</small>
  `;
  await transporter.sendMail({
    from: `"${SITE_NAME}" <${NOTIFY_EMAIL}>`,
    to: ADMIN_EMAIL,
    subject: `تاجر جديد بإنتظار الموافقة على ${SITE_NAME}`,
    html: message
  });
}

// ===== تسجيل مستخدم/تاجر =====
app.post('/api/auth/register',
  upload.fields([{ name: 'idCardImage', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]),
  async (req, res) => {
    try {
      const { username, fullName, email, password, phone, role } = req.body;
      if (!username || !fullName || !email || !password || !phone)
        return res.status(400).json({ message: 'كل الحقول مطلوبة' });
      if (await User.findOne({ email })) return res.status(400).json({ message: 'البريد مستخدم' });
      if (await User.findOne({ phone })) return res.status(400).json({ message: 'رقم الهاتف مستخدم' });

      let userData = { username, fullName, email, password: await bcrypt.hash(password, 12), phone, role: role || 'customer' };
      if (role === 'seller') {
        if (!req.files.idCardImage || !req.files.profileImage)
          return res.status(400).json({ message: 'يجب رفع صورة البطاقة وصورة شخصية للتاجر' });
        userData.idCardImage = req.files.idCardImage[0].path;
        userData.profileImage = req.files.profileImage[0].path;
        userData.sellerStatus = 'pending';
      }
      const user = new User(userData);
      await user.save();
      if (role === 'seller') await sendNewSellerEmail(userData);
      res.json({ message: 'تم إنشاء الحساب بنجاح' });
    } catch (err) {
      res.status(500).json({ message: 'خطأ في التسجيل' });
    }
  });

// ===== تسجيل الدخول =====
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'بيانات خاطئة' });
  if (user.role === 'seller' && user.sellerStatus !== 'approved')
    return res.status(403).json({ message: 'حسابك غير مفعل بعد' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: 'بيانات خاطئة' });
  const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
  res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict', maxAge: 24*60*60*1000 });
  res.json({ message: 'تم الدخول', user: { id: user._id, username: user.username, email: user.email, role: user.role } });
});

// ===== إضافة منتج (صور وفيديو إلزامي) =====
app.post('/api/products',
  authMiddleware, requireRole('seller'),
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]),
  async (req, res) => {
    try {
      const { name, description, price } = req.body;
      if (!req.files.video) return res.status(400).json({ message: 'رفع فيديو المنتج إلزامي' });
      if (!req.files.images || req.files.images.length === 0) return res.status(400).json({ message: 'يجب رفع صورة واحدة على الأقل للمنتج' });
      const images = req.files.images.map(f => f.path);
      const video = req.files.video[0].path;
      const product = new Product({
        name, description, price, images, video,
        seller: req.user.id, status: 'waiting'
      });
      await product.save();
      res.json({ message: 'تم إرسال السلعة للمراجعة' });
    } catch {
      res.status(500).json({ message: 'خطأ في إضافة السلعة' });
    }
  });

// ===== بحث عن منتجات منشورة =====
app.get('/api/products/search', async (req, res) => {
  const q = req.query.q || '';
  const products = await Product.find({
    status: 'published',
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } }
    ]
  }).populate({ path: 'seller', select: 'fullName' });
  res.json(products);
});

// ===== تفاصيل منتج =====
app.get('/api/products/:id', async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate({ path: 'seller', select: 'username fullName' })
    .populate({ path: 'reviews.customer', select: 'username' });
  if (!product || product.status !== 'published')
    return res.status(404).json({ message: 'السلعة غير موجودة' });
  res.json(product);
});

// ===== تقييم منتج (مشتري فقط) =====
app.post('/api/products/:id/review', authMiddleware, requireRole('customer'), async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product || product.status !== 'published') return res.status(404).json({ message: 'السلعة غير موجودة' });
    const alreadyReviewed = product.reviews.find(r => r.customer.toString() === req.user.id);
    if (alreadyReviewed) return res.status(400).json({ message: 'لقد قمت بتقييم هذه السلعة من قبل' });
    product.reviews.push({ customer: req.user.id, rating, comment });
    product.averageRating = product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length;
    await product.save();
    res.json({ message: 'تم إضافة التقييم', reviews: product.reviews, averageRating: product.averageRating });
  } catch {
    res.status(500).json({ message: 'خطأ في التقييم' });
  }
});

// ===== شراء منتج (المشتري يدخل عنوانه وطريقة الدفع) =====
app.post('/api/orders', authMiddleware, requireRole('customer'), async (req, res) => {
  try {
    const { productId, quantity, address, paymentMethod } = req.body;
    if (!address) return res.status(400).json({ message: 'العنوان مطلوب' });
    if (!['cash', 'visa'].includes(paymentMethod)) return res.status(400).json({ message: 'طريقة دفع غير صحيحة' });
    const product = await Product.findById(productId);
    if (!product || product.status !== 'published')
      return res.status(404).json({ message: 'المنتج غير موجود' });
    const order = new Order({
      product: productId,
      buyer: req.user.id,
      quantity: quantity || 1,
      address,
      paymentMethod
    });
    await order.save();
    res.json({ message: 'تم إنشاء الطلب بنجاح', order });
  } catch {
    res.status(500).json({ message: 'حدث خطأ في السيرفر' });
  }
});

// ===== طلبات التاجر (على سلعته) =====
app.get('/api/orders/for-seller', authMiddleware, requireRole('seller'), async (req, res) => {
  const products = await Product.find({ seller: req.user.id }).select('_id');
  const productIds = products.map(p => p._id);
  const orders = await Order.find({ product: { $in: productIds } })
    .populate('product')
    .populate('buyer', 'fullName address phone')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// ===== طلبات المشتري =====
app.get('/api/orders/my', authMiddleware, requireRole('customer'), async (req, res) => {
  const orders = await Order.find({ buyer: req.user.id })
    .populate('product')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// ===== طلبات الأدمن =====
app.get('/api/orders/all', authMiddleware, async (req, res) => {
  if (req.user?.email !== ADMIN_EMAIL)
    return res.status(403).json({ message: 'غير مصرح' });
  const orders = await Order.find()
    .populate('product')
    .populate('buyer', 'fullName address phone')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// ===== حل مشكلة 404 مع SPA =====
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return res.status(404).send("Not found");
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== تشغيل السيرفر =====
app.listen(5000, () => {
  console.log(`rayen backend running at ${SERVER_URL}`);
});
