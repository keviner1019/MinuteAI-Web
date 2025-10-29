/**
 * API Configuration Test Script
 * Run with: node scripts/test-apis.js
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('\n🔍 Testing MinuteAI API Configuration...\n');

// Test Firebase Configuration
console.log('📱 Firebase Configuration:');
console.log('  ✅ API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : '❌ Missing');
console.log('  ✅ Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Set' : '❌ Missing');
console.log('  ✅ Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Set' : '❌ Missing');
console.log('  ✅ Storage Bucket:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'Set' : '❌ Missing');
console.log('  ✅ Messaging Sender ID:', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'Set' : '❌ Missing');
console.log('  ✅ App ID:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'Set' : '❌ Missing');

// Test Firebase Admin Configuration
console.log('\n🔐 Firebase Admin Configuration:');
console.log('  ✅ Project ID:', process.env.FIREBASE_ADMIN_PROJECT_ID ? 'Set' : '❌ Missing');
console.log('  ✅ Client Email:', process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? 'Set' : '❌ Missing');
const privateKeySet = process.env.FIREBASE_ADMIN_PRIVATE_KEY && 
                      process.env.FIREBASE_ADMIN_PRIVATE_KEY.includes('BEGIN PRIVATE KEY') &&
                      !process.env.FIREBASE_ADMIN_PRIVATE_KEY.includes('Replace this');
console.log('  ' + (privateKeySet ? '✅' : '⚠️') + ' Private Key:', 
            privateKeySet ? 'Set' : 'Needs to be updated (see FIREBASE_ADMIN_SETUP.md)');

// Test AssemblyAI Configuration
console.log('\n🎙️ AssemblyAI Configuration:');
console.log('  ✅ API Key:', process.env.ASSEMBLYAI_API_KEY ? 'Set' : '❌ Missing');

// Test Google Gemini Configuration
console.log('\n🤖 Google Gemini Configuration:');
console.log('  ✅ API Key:', process.env.GOOGLE_GEMINI_API_KEY ? 'Set' : '❌ Missing');

// Summary
console.log('\n' + '='.repeat(50));
const allClientConfigured = 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.ASSEMBLYAI_API_KEY &&
  process.env.GOOGLE_GEMINI_API_KEY;

if (allClientConfigured && privateKeySet) {
  console.log('✅ All configurations are set! Ready to run: npm run dev');
} else if (allClientConfigured) {
  console.log('⚠️  Client-side ready! Firebase Admin needs setup.');
  console.log('   See FIREBASE_ADMIN_SETUP.md for instructions.');
  console.log('   You can still run: npm run dev (client features will work)');
} else {
  console.log('❌ Some configurations are missing. Check your .env.local file.');
}
console.log('='.repeat(50) + '\n');

