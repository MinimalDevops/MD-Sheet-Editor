/**
 * Environment variable validation utilities
 */

/**
 * Validates that at least one of the N8N domain environment variables is present
 * @returns {Object} Validation result with isValid boolean and error message if invalid
 */
export const validateN8NDomainConfig = () => {
  const localhost = process.env.REACT_APP_N8N_LOCALHOST;
  const customDomain = process.env.REACT_APP_N8N_CUSTOM_DOMAIN;
  
  // Check if at least one domain is configured
  if (!localhost && !customDomain) {
    return {
      isValid: false,
      error: 'Environment configuration error: Either REACT_APP_N8N_LOCALHOST or REACT_APP_N8N_CUSTOM_DOMAIN must be set in your .env file.'
    };
  }
  
  return {
    isValid: true,
    localhost: localhost || null,
    customDomain: customDomain || null
  };
};

/**
 * Gets the available N8N domains from environment variables
 * @returns {Array} Array of available domain configurations
 */
export const getAvailableN8NDomains = () => {
  const validation = validateN8NDomainConfig();
  
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  const domains = [];
  
  if (validation.localhost) {
    domains.push({
      type: 'localhost',
      domain: validation.localhost,
      protocol: 'http'
    });
  }
  
  if (validation.customDomain) {
    domains.push({
      type: 'custom',
      domain: validation.customDomain,
      protocol: 'https'
    });
  }
  
  return domains;
};

/**
 * Logs environment configuration status for debugging
 */
export const logEnvironmentConfig = () => {
  const validation = validateN8NDomainConfig();
  
  console.log('=== Environment Configuration ===');
  console.log('REACT_APP_N8N_LOCALHOST:', process.env.REACT_APP_N8N_LOCALHOST || 'NOT SET');
  console.log('REACT_APP_N8N_CUSTOM_DOMAIN:', process.env.REACT_APP_N8N_CUSTOM_DOMAIN || 'NOT SET');
  console.log('REACT_APP_N8N_PORT:', process.env.REACT_APP_N8N_PORT || '5678 (default)');
  console.log('Configuration valid:', validation.isValid);
  
  if (!validation.isValid) {
    console.error('❌', validation.error);
  } else {
    console.log('✅ Environment configuration is valid');
    if (validation.localhost) {
      console.log('📍 Localhost domain configured:', validation.localhost);
    }
    if (validation.customDomain) {
      console.log('🌐 Custom domain configured:', validation.customDomain);
    }
  }
  console.log('================================');
}; 