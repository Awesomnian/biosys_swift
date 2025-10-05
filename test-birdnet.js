// Test BirdNET API with known-good audio file
const fs = require('fs');
const https = require('https');
const FormData = require('form-data');

const testFile = 'C:\\AI\\biosys_swift\\BirdNET-Analyzer\\birdnet_analyzer\\example\\soundscape.wav';
const url = 'https://pruinose-alise-uncooled.ngrok-free.dev/inference/';

console.log('Testing BirdNET API...');
console.log('File:', testFile);
console.log('URL:', url);

// Check file exists
if (!fs.existsSync(testFile)) {
  console.error('Test file not found!');
  process.exit(1);
}

const fileStats = fs.statSync(testFile);
console.log('File size:', fileStats.size, 'bytes');

// Create form data
const form = new FormData();
form.append('file', fs.createReadStream(testFile));

// Add headers
const headers = {
  ...form.getHeaders(),
  'ngrok-skip-browser-warning': 'true'
};

// Make request
const urlObj = new URL(url);
const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || 443,
  path: urlObj.pathname,
  method: 'POST',
  headers: headers
};

const req = https.request(options, (res) => {
  console.log('Response status:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    if (res.statusCode === 200) {
      console.log('\n✅ BirdNET is working correctly!');
      console.log('The issue is with how the mobile app sends files.');
    } else {
      console.log('\n❌ BirdNET returned error');
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error);
});

form.pipe(req);