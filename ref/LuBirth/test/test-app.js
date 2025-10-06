#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Clear the log file
const logPath = path.join(__dirname, 'log_chrome.md');
fs.writeFileSync(logPath, '');

console.log('Starting LuBirth application test...');
console.log('Log file cleared at:', logPath);

// Function to append to log file
function appendToLog(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logPath, logEntry);
}

// Mock console methods to capture output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = function(...args) {
  originalConsoleLog.apply(console, args);
  appendToLog('LOG: ' + args.join(' '));
};

console.error = function(...args) {
  originalConsoleError.apply(console, args);
  appendToLog('ERROR: ' + args.join(' '));
};

console.warn = function(...args) {
  originalConsoleWarn.apply(console, args);
  appendToLog('WARN: ' + args.join(' '));
};

appendToLog('Log monitoring started');

// Check if the application can be imported
try {
  const simpleTestPath = path.join(__dirname, 'src', 'SimpleTest.tsx');
  if (fs.existsSync(simpleTestPath)) {
    appendToLog('SimpleTest.tsx file exists');
    
    // Read the file to check for obvious issues
    const content = fs.readFileSync(simpleTestPath, 'utf8');
    
    // Check for common React/Three.js import issues
    const imports = content.match(/import.*from.*['"].*['"]/g) || [];
    appendToLog('Found imports: ' + imports.length);
    
    // Check for potential issues
    const issues = [];
    
    if (content.includes('observerLat') && !content.includes('observerLat?:')) {
      issues.push('observerLat might not be properly typed');
    }
    
    if (content.includes('observerLon') && !content.includes('observerLon?:')) {
      issues.push('observerLon might not be properly typed');
    }
    
    if (issues.length > 0) {
      appendToLog('Potential issues found: ' + issues.join(', '));
    } else {
      appendToLog('No obvious issues found in SimpleTest.tsx');
    }
  } else {
    appendToLog('ERROR: SimpleTest.tsx file not found');
  }
  
  // Check Moon.tsx
  const moonPath = path.join(__dirname, 'src', 'scenes', 'simple', 'api', 'components', 'Moon.tsx');
  if (fs.existsSync(moonPath)) {
    appendToLog('Moon.tsx file exists');
    
    const moonContent = fs.readFileSync(moonPath, 'utf8');
    
    // Check if observerLat and observerLon are properly destructured
    if (moonContent.includes('observerLat,') && moonContent.includes('observerLon')) {
      appendToLog('observerLat and observerLon are properly destructured in Moon.tsx');
    } else {
      appendToLog('WARNING: observerLat and observerLon might not be properly destructured in Moon.tsx');
    }
  } else {
    appendToLog('ERROR: Moon.tsx file not found');
  }
  
} catch (error) {
  appendToLog('ERROR during file checking: ' + error.message);
}

appendToLog('Test completed');
console.log('Test completed. Check log_chrome.md for results.');