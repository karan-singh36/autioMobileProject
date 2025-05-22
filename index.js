const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const hbs = require('hbs');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const MongoStore = require('connect-mongo');
const Feedback = require('./models/Feedback');
const Contact = require('./models/Contact');
const connectDB = require('./src/config/db');
const Buyer = require('./models/Buyer'); 
const User = require('./models/User');

const app = express();

// Connect to MongoDB
connectDB();

// Configure paths
const publicDirectoryPath = path.join(__dirname, './public');
const viewsPath = path.join(__dirname, './template/view');
const partialsPath = path.join(__dirname, './template/partials');

// Setup handlebars engine and views location
app.set('view engine', 'hbs');
app.set('views', viewsPath);
hbs.registerPartials(partialsPath);

// Session configuration with MongoStore
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/yourdb' }),
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(express.static(publicDirectoryPath));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());
app.use(passport.session());

hbs.registerHelper('formatDate', function(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) return done(null, false, { message: 'Incorrect email.' });
    const isMatch = await user.correctPassword(password, user.password);
    if (!isMatch) return done(null, false, { message: 'Incorrect password.' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

app.get('/', (req, res) => {
  if (req.user) return res.redirect('/index');
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.user) return res.redirect('/index');
  res.render('login', { title: 'Login', user: req.user, error: req.query.error });
});

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect('/login?error=' + encodeURIComponent(info.message));
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect('/index');
    });
  })(req, res, next);
});

app.get('/signup', (req, res) => {
  if (req.user) return res.redirect('/index');
  res.render('signup', { title: 'Sign Up', user: req.user, error: req.query.error });
});

app.post('/signup', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) return res.redirect('/signup?error=' + encodeURIComponent('Passwords do not match'));
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.redirect('/signup?error=' + encodeURIComponent('Email already in use'));
    const newUser = await User.create({ name, email, password, passwordConfirm: confirmPassword });
    req.login(newUser, (err) => {
      if (err) return res.redirect('/login');
      return res.redirect('/index');
    });
  } catch (err) {
    res.redirect('/signup?error=' + encodeURIComponent('An error occurred during signup'));
  }
});

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login');
  });
});

app.get('/dashboard', isLoggedIn, (req, res) => {
  res.render('dashboard', { title: 'Dashboard', user: req.user });
});

app.get('/about', isLoggedIn, (req, res) => {
  res.render('about', { title: 'About Page', user: req.user });
});

app.get('/help', isLoggedIn, (req, res) => {
  res.render('help', { title: 'Help Page', user: req.user });
});

app.get('/feedback', isLoggedIn, (req, res) => {
  res.render('feedback', { title: 'Feedback Page', user: req.user });
});

app.get('/services', isLoggedIn, (req, res) => {
  res.render('services', { title: 'Services Page', user: req.user });
});

app.get('/index', isLoggedIn, (req, res) => {
  res.render('index', { title: 'Home Page', user: req.user });
});

app.post('/submit-feedback', isLoggedIn, async (req, res) => {
  try {
    await Feedback.create(req.body);
    res.send('Feedback received!');
  } catch (error) {
    res.status(500).send('Error saving feedback');
  }
});

app.post('/submit-contact', isLoggedIn, async (req, res) => {
  try {
    await Contact.create(req.body);
    res.send('Contact information received!');
  } catch (error) {
    res.status(500).send('Error saving contact information');
  }
});

app.get('/bikes', isLoggedIn, async (req, res) => {
  try {
    const bikes = await Buyer.find({});
    res.render('bikes', { bikes, user: req.user });
  } catch (error) {
    res.status(500).send('Failed to fetch bikes');
  }
});

app.post('/bikes/add', isLoggedIn, async (req, res) => {
  try {
    await Buyer.create(req.body);
    res.redirect('/bikes');
  } catch (error) {
    res.status(500).send('Failed to add bike');
  }
});

app.post('/bikes/update/:id', isLoggedIn, async (req, res) => {
  try {
    await Buyer.findByIdAndUpdate(req.params.id, req.body);
    res.redirect('/bikes');
  } catch (error) {
    res.status(500).send('Failed to update bike');
  }
});

app.post('/bikes/delete/:id', isLoggedIn, async (req, res) => {
  try {
    await Buyer.findByIdAndDelete(req.params.id);
    res.redirect('/bikes');
  } catch (error) {
    res.status(500).send('Failed to delete bike');
  }
});

app.listen(3002, () => {
  console.log('Server is up on port 3002.');
});


module.exports = app;
