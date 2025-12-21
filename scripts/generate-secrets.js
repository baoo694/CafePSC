#!/usr/bin/env node

/**
 * Script to generate secure random secrets for environment variables
 * Usage: node scripts/generate-secrets.js
 */

import crypto from 'crypto';

/**
 * Generate a secure random string
 * @param {number} length - Length of the string (default: 64)
 * @returns {string} Random hex string
 */
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random base64 string
 * @param {number} length - Length in bytes (default: 48)
 * @returns {string} Random base64 string
 */
function generateBase64Secret(length = 48) {
  return crypto.randomBytes(length).toString('base64');
}

console.log('🔐 Generating secure secrets for environment variables...\n');
console.log('='.repeat(80));
console.log('\n📋 Copy these values to your Vercel Environment Variables:\n');
console.log('-'.repeat(80));

// Generate CSRF_SECRET (32+ characters recommended)
const csrfSecret = generateSecret(32);
console.log('\n🔒 CSRF_SECRET:');
console.log(csrfSecret);
console.log('\n   Description: Secret key for CSRF token generation and verification');
console.log('   Length: 64 characters (hex)');
console.log('   Required: Yes (for CSRF protection)');

// Generate JWT_SECRET (32+ characters recommended)
const jwtSecret = generateSecret(32);
console.log('\n\n🔑 JWT_SECRET:');
console.log(jwtSecret);
console.log('\n   Description: Secret key for JWT token signing and verification');
console.log('   Length: 64 characters (hex)');
console.log('   Required: Yes (for admin authentication)');

// Generate ADMIN_PASSWORD reminder
console.log('\n\n🔐 ADMIN_PASSWORD:');
console.log('   [You need to set this manually - use a strong password]');
console.log('   Requirements:');
console.log('   - At least 12 characters');
console.log('   - Mix of uppercase, lowercase, numbers, and special characters');
console.log('   - Example: MyStr0ng!P@ssw0rd');

console.log('\n\n' + '='.repeat(80));
console.log('\n✅ Secrets generated successfully!');
console.log('\n📝 Next steps:');
console.log('   1. Copy CSRF_SECRET and JWT_SECRET to Vercel Environment Variables');
console.log('   2. Set ADMIN_PASSWORD to a strong password');
console.log('   3. Set ALLOWED_ORIGINS (comma-separated list of allowed origins)');
console.log('   4. Set SUPABASE_URL and SUPABASE_ANON_KEY');
console.log('   5. Set SUPABASE_SERVICE_ROLE_KEY (for admin operations)');
console.log('\n⚠️  IMPORTANT: Never commit these secrets to git!');
console.log('='.repeat(80) + '\n');

