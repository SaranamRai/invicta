const Tesseract = require('tesseract.js');
const path = require('path');

const imagePath = 'C:\\Users\\Saranam\\.gemini\\antigravity-ide\\brain\\6fadf007-4314-4bca-b2c1-5c7e85258bc2\\media__1781715542767.png';

Tesseract.recognize(
  imagePath,
  'eng',
  { logger: m => console.log(m) }
).then(({ data: { text } }) => {
  console.log("=== OCR RESULT ===");
  console.log(text);
});
