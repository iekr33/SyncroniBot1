#!/usr/bin/env node

const chromeCookiesSecure = require('chrome-cookies-secure');
const fs = require('fs');
const path = require('path');

// Specify the target domain for YouTube cookies
const youtubeDomain = 'https://www.youtube.com';

// Function to format cookies into cookies.txt format
function formatCookiesToTxt(cookies) {
  return cookies.map((cookie) => {
    const { domain, path, secure, expirationDate, name, value } = cookie;
    const httpOnly = cookie.httpOnly ? '#HttpOnly_' : '';
    const secureFlag = secure ? 'TRUE' : 'FALSE';
    const expiration = expirationDate ? Math.floor(expirationDate) : '0';
    return `${httpOnly}${domain}\t${secureFlag}\t${path}\t${secureFlag}\t${expiration}\t${name}\t${value}`;
  }).join('\n');
}

// Main function
function main() {
  console.log('Fetching cookies for YouTube...');

  // Get cookies from Chrome
  chromeCookiesSecure.getCookies(youtubeDomain, 'puppeteer', (err, cookies) => {
    if (err) {
      console.error('Error fetching cookies:', err);
      process.exit(1);
    }

    if (!cookies || cookies.length === 0) {
      console.log('No cookies found for YouTube.');
      return;
    }

    // Format cookies into cookies.txt format
    const cookiesTxt = formatCookiesToTxt(cookies);

    // Write to cookies.txt file
    const outputFilePath = path.join(process.cwd(), 'cookies.txt');
    fs.writeFileSync(outputFilePath, cookiesTxt, 'utf8');
    console.log(`Cookies saved to ${outputFilePath}`);
  });
}

// Execute the script
main();
