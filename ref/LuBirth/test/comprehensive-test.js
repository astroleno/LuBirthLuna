import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Clear the log file
const logPath = path.join(__dirname, 'log_chrome.md');
fs.writeFileSync(logPath, '');

console.log('Starting comprehensive LuBirth application test...');

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

appendToLog('Comprehensive test started');

// Test 1: Check if all required files exist
appendToLog('=== Test 1: File Existence ===');

const requiredFiles = [
  'src/SimpleTest.tsx',
  'src/scenes/simple/api/components/Moon.tsx',
  'src/scenes/simple/api/components/Earth.tsx',
  'src/scenes/simple/utils/moonPhaseCalculator.ts',
  'src/types/SimpleComposition.ts',
  'package.json'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    appendToLog(`✓ ${file} exists`);
  } else {
    appendToLog(`✗ ${file} missing`);
  }
});

// Test 2: Check Moon component props
appendToLog('=== Test 2: Moon Component Props ===');

const moonPath = path.join(__dirname, 'src/scenes/simple/api/components/Moon.tsx');
const moonContent = fs.readFileSync(moonPath, 'utf8');

// Check if observerLat and observerLon are properly defined
const observerLatMatch = moonContent.match(/observerLat.*?:.*?number/);
const observerLonMatch = moonContent.match(/observerLon.*?:.*?number/);

if (observerLatMatch && observerLonMatch) {
  appendToLog('✓ observerLat and observerLon are properly typed');
} else {
  appendToLog('✗ observerLat and observerLon typing issue');
}

// Test 3: Check SimpleTest.tsx Moon usage
appendToLog('=== Test 3: SimpleTest Moon Usage ===');

const simpleTestPath = path.join(__dirname, 'src/SimpleTest.tsx');
const simpleTestContent = fs.readFileSync(simpleTestPath, 'utf8');

// Check if Moon component is used with correct props
const moonUsageMatch = simpleTestContent.match(/<Moon[^>]*>/);
if (moonUsageMatch) {
  const moonProps = moonUsageMatch[0];
  appendToLog('Found Moon component usage');
  
  if (moonProps.includes('observerLat=') && moonProps.includes('observerLon=')) {
    appendToLog('✓ observerLat and observerLon props are being passed');
  } else {
    appendToLog('✗ observerLat and observerLon props missing');
  }
} else {
  appendToLog('✗ Moon component not found in SimpleTest.tsx');
}

// Test 4: Check for potential runtime issues
appendToLog('=== Test 4: Runtime Issue Detection ===');

// Check for undefined variables
const undefinedPatterns = [
  /observerLat\s*=/,
  /observerLon\s*=/,
  /latDeg\s*=/,
  /lonDeg\s*=/
];

undefinedPatterns.forEach(pattern => {
  const matches = simpleTestContent.match(pattern);
  if (matches) {
    appendToLog(`Found variable assignment: ${matches[0]}`);
  }
});

// Test 5: Check if variables are properly initialized
appendToLog('=== Test 5: Variable Initialization ===');

const stateVariables = [
  { name: 'latDeg', pattern: /const\s+latDeg\s*=/ },
  { name: 'lonDeg', pattern: /const\s+lonDeg\s*=/ },
  { name: 'dateISO', pattern: /const\s+dateISO\s*=/ }
];

stateVariables.forEach(variable => {
  const match = simpleTestContent.match(variable.pattern);
  if (match) {
    appendToLog(`✓ ${variable.name} is properly initialized`);
  } else {
    appendToLog(`✗ ${variable.name} initialization issue`);
  }
});

// Test 6: Check build dependencies
appendToLog('=== Test 6: Build Dependencies ===');

const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const requiredDeps = ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'];
requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    appendToLog(`✓ ${dep} dependency found`);
  } else {
    appendToLog(`✗ ${dep} dependency missing`);
  }
});

appendToLog('=== Test Summary ===');
appendToLog('All tests completed. Review the log for any issues.');

console.log('Comprehensive test completed. Check log_chrome.md for detailed results.');