/**
 * Simple tests for environment validation
 * Run with: node src/utils/envValidation.test.js
 */

// Mock process.env for testing
const originalEnv = process.env;

// Import the functions to test
const { validateN8NDomainConfig, getAvailableN8NDomains, logEnvironmentConfig } = require('./envValidation');

function testEnvironmentValidation() {
  console.log('🧪 Testing Environment Validation...\n');

  // Test 1: No environment variables set
  console.log('Test 1: No environment variables set');
  process.env = {};
  const result1 = validateN8NDomainConfig();
  console.log('Result:', result1);
  console.log('Expected: isValid: false, error message present');
  console.log('✅ Pass:', !result1.isValid && result1.error.includes('must be set'));
  console.log('');

  // Test 2: Only localhost set
  console.log('Test 2: Only REACT_APP_N8N_LOCALHOST set');
  process.env = {
    REACT_APP_N8N_LOCALHOST: 'localhost'
  };
  const result2 = validateN8NDomainConfig();
  console.log('Result:', result2);
  console.log('Expected: isValid: true, localhost: "localhost", customDomain: null');
  console.log('✅ Pass:', result2.isValid && result2.localhost === 'localhost' && result2.customDomain === null);
  console.log('');

  // Test 3: Only custom domain set
  console.log('Test 3: Only REACT_APP_N8N_CUSTOM_DOMAIN set');
  process.env = {
    REACT_APP_N8N_CUSTOM_DOMAIN: 'n8n.example.com'
  };
  const result3 = validateN8NDomainConfig();
  console.log('Result:', result3);
  console.log('Expected: isValid: true, localhost: null, customDomain: "n8n.example.com"');
  console.log('✅ Pass:', result3.isValid && result3.localhost === null && result3.customDomain === 'n8n.example.com');
  console.log('');

  // Test 4: Both set
  console.log('Test 4: Both environment variables set');
  process.env = {
    REACT_APP_N8N_LOCALHOST: 'localhost',
    REACT_APP_N8N_CUSTOM_DOMAIN: 'n8n.example.com'
  };
  const result4 = validateN8NDomainConfig();
  console.log('Result:', result4);
  console.log('Expected: isValid: true, both localhost and customDomain present');
  console.log('✅ Pass:', result4.isValid && result4.localhost === 'localhost' && result4.customDomain === 'n8n.example.com');
  console.log('');

  // Test 5: getAvailableN8NDomains with both set
  console.log('Test 5: getAvailableN8NDomains with both variables set');
  try {
    const domains = getAvailableN8NDomains();
    console.log('Result:', domains);
    console.log('Expected: Array with 2 domain objects');
    console.log('✅ Pass:', Array.isArray(domains) && domains.length === 2);
  } catch (error) {
    console.log('❌ Fail:', error.message);
  }
  console.log('');

  // Test 6: getAvailableN8NDomains with no variables (should throw)
  console.log('Test 6: getAvailableN8NDomains with no variables (should throw)');
  process.env = {};
  try {
    getAvailableN8NDomains();
    console.log('❌ Fail: Should have thrown an error');
  } catch (error) {
    console.log('✅ Pass: Threw error as expected:', error.message);
  }
  console.log('');

  // Restore original environment
  process.env = originalEnv;
  console.log('🎉 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testEnvironmentValidation();
}

module.exports = { testEnvironmentValidation }; 