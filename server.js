const express = require('express');
const http = require('http');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const server = http.createServer(app);

const userFile = path.join(__dirname, 'src', 'controllers', 'users.json');
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(express.urlencoded({ extended: true }));


// checks for users.json exists
function loadUsers() {
    try {
        if (!fs.existsSync(userFile)) {
            fs.writeFileSync(userFile, JSON.stringify({}, null, 2)); // Create an empty users file
        }
        return JSON.parse(fs.readFileSync(userFile, 'utf-8'));
    } catch (error) {
        console.error("Error loading users:", error);
        return {};
    }
}

function saveUsers(users) {
    fs.writeFileSync(userFile, JSON.stringify(users, null, 2)); // Save users to file
}

// Use sessions to track logged-in users
app.use(session({
    secret: 'mynameissumit',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    } 
}));

// Home Page 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'public', 'home.html'));
});

// Serve Login Page 
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'public', 'login.html'));
});

// Handle Login 
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    let users = loadUsers();

    if (users[email] && users[email].password === password) {
        req.session.user = email; // Store session
        return res.json({ success: true, message: "Login successful!", redirect: "/dashboard" });
    }else if(!users[email]){
        return res.status(401).json({ success: false, message: "User not found." });
        
   
    }else {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
});

// Serve Register Page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'public', 'register.html'));
});

// Register User 
app.post('/register', (req, res) => {
    const { email, password } = req.body;
    let users = loadUsers();

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    if (users[email]) {
        return res.status(400).json({ success: false, message: "User already exists." });
    }

    users[email] = { password };
    saveUsers(users);

    return res.json({ success: true, message: "Signup successful! Now you can login." });
});

// Protect Dashboard Route from unauthenticated users
app.get('/dashboard', (req, res) => {
   
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Unauthorized. Please log in first." });
    }
    res.sendFile(path.join(__dirname, 'src', 'public', 'dashboard.html'));
});

// Serve Update Profile Page 
app.get('/update', (req, res) => {
    console.log("Session in /update GET:", req.session);
    if (!req.session.user || req.session.user === "") {
        return res.status(401).json({ success: false, message: "Unauthorized. Please log in first." });
    }else{
        res.sendFile(path.join(__dirname, 'src', 'public', 'update.html'));
    }
    
});

// CSRF-Vulnerable Profile Update page
app.post('/update', (req, res) => {
    console.log("Session in /update POST:", req.session);
    let users = loadUsers();
    const { userEmail, newEmail, newPassword } = req.body;

    if (!userEmail) {
        return res.status(400).json({ success: false, message: "User email is required." });
    }
    if(!req.session.user){

        return res.status(400).json({ success: false, message: "user email not in session" });
    }
    if(req.session.user != userEmail){
        return res.status(400).json({ success: false, message: "Forbidden. You can only update your own profile. " });
    }
    const currentEmail = userEmail; // updates the user (vulnerable logic)

    // checks current email exists in users
    if (!users[currentEmail]) {
        return res.status(400).json({ success: false, message: "User not found." });
    }

    // If newEmail is provided, ensure it exists before accessing properties
    if (newEmail) {
        users[newEmail] = { password: users[currentEmail].password }; 
        delete users[currentEmail]; // Delete old entry
        req.session.user = newEmail; // Update session
    }

    // Get the email that should be updated
    const targetEmail = newEmail || currentEmail;

    //  targetEmail exists before modifying it
    if (!users[targetEmail]) {
        return res.status(400).json({ success: false, message: "Error updating user." });
    }

    // Update password if provided
    if (newPassword) {
        users[targetEmail].password = newPassword;
    }

    saveUsers(users);
    return res.json({ success: true, message: "Profile updated successfully!" });
});
app.get('/logout', (req, res) => {
    console.log("Session in /logout:", req.session);
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).json({ success: false, message: "Error logging out." });
        }
        
        res.sendFile(path.join(__dirname, 'src', 'public', 'home.html'));
    });
});

// Start Server
const PORT = process.env.SERVER_PORT || 4000;
const IP = process.env.SERVER_IP || '127.0.0.1';
server.listen(PORT, IP, () => {
    console.log(`Server is running on http://${IP}:${PORT}`);
});
