const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const session = require('express-session');
const cookieParser = require('cookie-parser'); 
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');


const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));
app.use(cookieParser());

const db = 'users.json';
const servicedb = 'services.json';
const secretKey = 'your-secret-key';


// Initialize the user data array from the JSON file (if it exists).
let users = [];
if (fs.existsSync(db)) {
  const data = fs.readFileSync(db, 'utf-8');
  if (data) {
    users = JSON.parse(data);
    console.log('Users data loaded successfully.');
  } else{
    console.log('The JSON file is empty or contains no data.');
  }
}

let services = [];
if (fs.existsSync(db)) {
  const data = fs.readFileSync(servicedb, 'utf-8');
  if (data) {
    services = JSON.parse(data);
    console.log('Services data loaded successfully.');
  } else{
    console.log('The JSON file is empty or contains no data.');
  }
}

const authenticateUser = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    // Handle unauthorized access
    // return res.status(401).json({ message: 'Unauthorized' });
    console.log("Unauthorised")
  }
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      // Token is invalid or expired
      // return res.status(403).json({ message: 'Token is invalid or expired' });
      // console.log(token)
      console.log('Token is invalid or expired')
    }
    // Attach the user data to the request
    req.user = user;
    next();
  });
};

/**
 * user regisiration
 */
app.get('/register', (req, res) => {
  res.render("signup");
});
app.post('/register', (req, res) => {
  const { fullname, email, phone, username, password } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.log('error when generating Hash');
    } else {
      const newUser = {
        id: uuidv4(),
        fullname: fullname,
        email: email,
        phone: phone,
        username: username,
        password: hash,
        service: []
      };
      const existingUseruser = users.find(u => u.username === username && u.email === email);
      if (!existingUseruser){
        users.push(newUser);
        fs.writeFileSync(db, JSON.stringify(users, null, 2), 'utf-8');
        res.redirect("/login")
      } else {
        console.log("user already exixts")
        res.redirect("/login")
      }
    }
  })
});

/**
 * user login
 */
app.get('/login', (req, res) => {
  res.render("login");
});
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (user) {
    bcrypt.compare(password, user.password, (err, result) => {
      if ( result ) {
        const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: '1h' });
        res.cookie('access_token', token, { httpOnly: true });
        req.session.user = user;
        if (user.username === "admin") {
          res.redirect("/admin")
        } else {
          res.redirect("/dashboard");
        }
      } else {
        res.redirect('/login');
      }
    })
  }
});

/**
 * admin dashoard
 */
app.get("/admin", authenticateUser, (req,res) => {
  if (req.session.user) {
    res.render("admin", {users})
  }
});

/**
 * user dashoard
 */
app.get('/dashboard', authenticateUser, (req, res) => {
    if (req.session.user) {
      // console.log(authenticateUser)
      res.render("index" , {services: services, serve: req.session.user.service});
    } else {
      res.redirect('/login');
    }
});

app.post('/services', (req,res) =>{
  if (req.session.user) {
    const {service, title} = req.body;
    const serve = services.find(u => u.service === service );
    const status = "just initiated"
    const servic = {
      id: uuidv4(),
      service: serve.service,
      title: title,
      price: serve.price,
      status: status
    }
    if (serve){
      const user = users.find(u => u.id === req.session.user.id)
      user.service.push(servic)
      fs.writeFileSync(db, JSON.stringify(users, null, 2), 'utf-8');
      res.redirect('/dashboard');
    }
    } else{
      res.redirect('/login')
    }
  
})

// Logout route
app.get('/logout', (req, res) => {
  req.logout();
  req.session.destroy();
  res.redirect('/login');
})

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});