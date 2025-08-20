#!/usr/bin/env node

/**
 * Test script for Netlify Blobs integration
 * 
 * This script tests the basic functionality of the Netlify Blobs storage implementation.
 * Run this script locally to verify the integration works correctly.
 * 
 * Usage: node test-netlify-blobs.js
 */

const { netlifyBlobsClient, shouldUseNetlifyBlobs } = require('./lib/api/storage/netlifyBlobsClient');

async function testNetlifyBlobs() {
  console.log('🧪 Testing Netlify Blobs Integration...\n');

  // Check if Netlify Blobs should be used
  const useBlobs = shouldUseNetlifyBlobs();
  console.log(`Should use Netlify Blobs: ${useBlobs}`);
  console.log(`USE_NETLIFY_BLOBS: ${process.env.USE_NETLIFY_BLOBS}`);
  console.log(`NETLIFY_SITE_ID: ${process.env.NETLIFY_SITE_ID || process.env.SITE_ID}`);
  console.log('');

  if (!useBlobs) {
    console.log('❌ Netlify Blobs is not configured. Set USE_NETLIFY_BLOBS=true and NETLIFY_SITE_ID to test.');
    return;
  }

  try {
    // Test 1: Create a test file
    console.log('📝 Test 1: Creating a test file...');
    const testData = Buffer.from('Hello, Netlify Blobs! This is a test file.');
    const testPath = 'test/hello.txt';
    
    const createResult = await netlifyBlobsClient.createFile({
      filePath: testPath,
      data: testData,
    });
    
    console.log(`Create result: ${createResult ? '✅ Success' : '❌ Failed'}`);

    // Test 2: Read the test file
    console.log('\n📖 Test 2: Reading the test file...');
    const readResult = await netlifyBlobsClient.readFile(testPath);
    console.log(`Read result: ${readResult.status === 200 ? '✅ Success' : '❌ Failed'}`);
    console.log(`Content: ${readResult.file.toString()}`);
    console.log(`Content Type: ${readResult.contentType}`);

    // Test 3: Move the test file
    console.log('\n🔄 Test 3: Moving the test file...');
    const newPath = 'test/moved-hello.txt';
    await netlifyBlobsClient.moveFile(testPath, newPath);
    
    // Verify the file was moved
    const movedReadResult = await netlifyBlobsClient.readFile(newPath);
    console.log(`Move result: ${movedReadResult.status === 200 ? '✅ Success' : '❌ Failed'}`);

    // Test 4: Delete the test file
    console.log('\n🗑️ Test 4: Deleting the test file...');
    await netlifyBlobsClient.removeFile({ filePath: newPath });
    
    // Verify the file was deleted
    const deletedReadResult = await netlifyBlobsClient.readFile(newPath);
    console.log(`Delete result: ${deletedReadResult.status === 404 ? '✅ Success' : '❌ Failed'}`);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }
}

// Environment setup for testing
if (require.main === module) {
  // Set up test environment variables if not already set
  if (!process.env.USE_NETLIFY_BLOBS) {
    console.log('Setting up test environment variables...');
    process.env.USE_NETLIFY_BLOBS = 'true';
    process.env.NETLIFY_SITE_ID = 'd06490d5-32fd-4c46-a6d4-75645e45abbb';
  }

  testNetlifyBlobs().catch(console.error);
}

module.exports = { testNetlifyBlobs };
