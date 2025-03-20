// Test file with security issues and bad practices for Semgrep to find

// Hardcoded secret (insecure)
const API_KEY = 'sk_test_abcdef1234567890';

// Insecure cipher (weak cryptography)
const crypto = require('crypto');
function encryptData(data) {
  const cipher = crypto.createCipher('des', 'weak-key');
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// SQL Injection vulnerability
const express = require('express');
const mysql = require('mysql');
const app = express();

app.get('/user', (req, res) => {
  const userId = req.query.id;
  
  // SQL Injection vulnerability
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  
  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'test_db'
  });
  
  connection.query(query, (err, results) => {
    if (err) {
      res.status(500).send('Error');
      return;
    }
    res.json(results);
  });
});

// Insecure use of eval
app.get('/eval', (req, res) => {
  const userInput = req.query.code;
  try {
    const result = eval(userInput);  // Dangerous!
    res.send(`Result: ${result}`);
  } catch (e) {
    res.status(400).send('Invalid code');
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
}); 