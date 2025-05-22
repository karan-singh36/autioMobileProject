
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const hbs = require('hbs');
const Feedback = require('./models/Feedback');
const Contact = require('./models/Contact');
const connectDB = require('./src/config/db');
const Buyer = require('./models/Buyer'); 
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
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

// Session configuration
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Setup static directory to serve
app.use(express.static(publicDirectoryPath));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Date formatting helper
hbs.registerHelper('formatDate', function(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Passport configuration
passport.use(new LocalStrategy({
  usernameField: 'email'
}, async (email, password, done) => {
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

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
  if (req.user) {
    return res.redirect('/index');
  }
  res.redirect('/login');
});

// Login routes
app.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect('/index');
  }
  res.render('login', { 
    title: 'Login',
    user: req.user,
    error: req.query.error
  });
});

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.redirect('/login?error=' + encodeURIComponent(info.message));
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect('/index');
    });
  })(req, res, next);
});

// Signup routes
app.get('/signup', (req, res) => {
  if (req.user) {
    return res.redirect('/index');
  }
  res.render('signup', { 
    title: 'Sign Up',
    user: req.user,
    error: req.query.error
  });
});

app.post('/signup', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    
    if (password !== confirmPassword) {
      return res.redirect('/signup?error=' + encodeURIComponent('Passwords do not match'));
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.redirect('/signup?error=' + encodeURIComponent('Email already in use'));
    }
    
    const newUser = await User.create({ name, email, password, passwordConfirm: confirmPassword });
    
    req.login(newUser, (err) => {
      if (err) {
        console.error(err);
        return res.redirect('/login');
      }
      return res.redirect('/index');
    });
    
  } catch (err) {
    console.error(err);
    res.redirect('/signup?error=' + encodeURIComponent('An error occurred during signup'));
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/login');
});

// Protected routes
app.get('/dashboard', isLoggedIn, (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard',
    user: req.user
  });
});

app.get('/about', isLoggedIn, (req, res) => {
  res.render('about', {
    title: 'About Page',
    user: req.user
  });
});

app.get('/help', isLoggedIn, (req, res) => {
  res.render('help', {
    title: 'Help Page',
    user: req.user
  });
});

app.get('/feedback', isLoggedIn, (req, res) => {
  res.render('feedback', {
    title: 'Feedback Page',
    user: req.user
  });
});

app.get('/services', isLoggedIn, (req, res) => {
  res.render('services', {
    title: 'services Page',
    user: req.user
  });
});

app.get('/index', isLoggedIn, (req, res) => {
  res.render('index', {
    title: 'Home Page',
    user: req.user
  });
});

// Form submission handlers
app.post('/submit-feedback', isLoggedIn, async (req, res) => {
  try {
    await Feedback.create(req.body);
    res.send('Feedback received!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving feedback');
  }
});

app.post('/contact-us', isLoggedIn, async (req, res) => {
  try {
    await Contact.create(req.body);
    res.send('Message received!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving contact message');
  }
});

app.post('/submit-form', isLoggedIn, (req, res) => {
  const { name, email, phone, interestedBike } = req.body;

  const newBuyer = new Buyer({
    name,
    email,
    phone,
    interestedBike
  });

  newBuyer.save()
    .then(() => res.send('Your interest has been submitted!'))
    .catch((err) => res.status(500).send('Error saving your data: ' + err));
});

// Define schema for bikes collection
const bikeSchema = new mongoose.Schema({
  model: { 
      type: String, 
      required: [true, 'Model name is required'],
      trim: true,
      minlength: [2, 'Model name must be at least 2 characters']
  },
  brand: { 
      type: String, 
      required: [true, 'Brand name is required'],
      trim: true
  },
  price: { 
      type: Number, 
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
  },
  quantity: { 
      type: Number, 
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0
  },
  createdAt: {
      type: Date,
      default: Date.now
  }
});

// Create model for bikes collection (check if already exists)
const Bike = mongoose.models.Bike || mongoose.model('Bike', bikeSchema);

// Validation middleware for bike data
const validateBikeData = (req, res, next) => {
  const { model, brand, price, quantity } = req.body;
  
  if (!model || !brand || !price) {
      return res.status(400).json({
          error: 'Missing required fields'
      });
  }

  if (price < 0 || quantity < 0) {
      return res.status(400).json({
          error: 'Price and quantity must be non-negative'
      });
  }

  next();
};

// Bikes Routes with authentication
app.get('/bikes', isLoggedIn, async (req, res) => {
  try {
      const bikes = await Bike.find({}).sort({ createdAt: -1 });
      res.render('bikes', {
          title: 'Bike Inventory',
          user: req.user,
          bikes,
          success: req.query.success,
          error: req.query.error
      });
  } catch (error) {
      console.error('Error fetching bikes:', error);
      res.render('bikes', {
          title: 'Bike Inventory',
          user: req.user,
          bikes: [],
          error: 'Failed to fetch bikes'
      });
  }
});

app.post('/bikes/add', isLoggedIn, validateBikeData, async (req, res) => {
  try {
      const bike = new Bike({
          ...req.body,
          quantity: parseInt(req.body.quantity) || 0
      });
      await bike.save();
      res.redirect('/bikes?success=Bike added successfully');
  } catch (error) {
      console.error('Error adding bike:', error);
      res.redirect('/bikes?error=' + encodeURIComponent(error.message));
  }
});

app.post('/bikes/update/:id', isLoggedIn, validateBikeData, async (req, res) => {
  try {
      const { id } = req.params;
      const bike = await Bike.findById(id);
      
      if (!bike) {
          return res.redirect('/bikes?error=Bike not found');
      }

      await Bike.findByIdAndUpdate(id, 
          { ...req.body, quantity: parseInt(req.body.quantity) || 0 },
          { new: true, runValidators: true }
      );
      
      res.redirect('/bikes?success=Bike updated successfully');
  } catch (error) {
      console.error('Error updating bike:', error);
      res.redirect('/bikes?error=' + encodeURIComponent(error.message));
  }
});

app.post('/bikes/delete/:id', isLoggedIn, async (req, res) => {
  try {
      const { id } = req.params;
      const bike = await Bike.findById(id);
      
      if (!bike) {
          return res.redirect('/bikes?error=Bike not found');
      }

      await Bike.findByIdAndDelete(id);
      res.redirect('/bikes?success=Bike deleted successfully');
  } catch (error) {
      console.error('Error deleting bike:', error);
      res.redirect('/bikes?error=' + encodeURIComponent(error.message));
  }
});
// 404 Page
app.get('*', (req, res) => {
  res.render('404', {
    title: '404',
    user: req.user,
    errorMessage: 'Page not found'
  });
});



// Start the server
app.listen(3002, () => {
  console.log('Server is up on port 3002.');
});