#!/usr/bin/env node

// Test script for the new blob functions
// Run with: node test-blob-functions.js

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:8888'; // Default netlify dev URL

async function testBlobFunctions() {
  console.log('Testing Netlify Blob Functions...\n');

  try {
    // Test 1: Create a file
    console.log('1. Testing file creation...');
    const createResponse = await fetch(`${BASE_URL}/api/blobs/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filePath: 'test/sample.txt',
        data: 'Hello, Netlify Blobs!',
        metadata: { test: true }
      })
    });
    
    const createResult = await createResponse.json();
    console.log('Create result:', createResult);

    if (!createResponse.ok) {
      throw new Error(`Create failed: ${createResult.error}`);
    }

    // Test 2: Read the file
    console.log('\n2. Testing file reading...');
    const readResponse = await fetch(`${BASE_URL}/api/blobs/read?filePath=${encodeURIComponent('test/sample.txt')}`);
    
    if (readResponse.ok) {
      const content = await readResponse.text();
      console.log('File content:', content);
    } else {
      const readError = await readResponse.json();
      console.log('Read error:', readError);
    }

    // Test 3: Move the file
    console.log('\n3. Testing file moving...');
    const moveResponse = await fetch(`${BASE_URL}/api/blobs/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fromPath: 'test/sample.txt',
        toPath: 'test/moved-sample.txt'
      })
    });
    
    const moveResult = await moveResponse.json();
    console.log('Move result:', moveResult);

    // Test 4: Read moved file
    console.log('\n4. Testing reading moved file...');
    const readMovedResponse = await fetch(`${BASE_URL}/api/blobs/read?filePath=${encodeURIComponent('test/moved-sample.txt')}`);
    
    if (readMovedResponse.ok) {
      const movedContent = await readMovedResponse.text();
      console.log('Moved file content:', movedContent);
    } else {
      const readMovedError = await readMovedResponse.json();
      console.log('Read moved error:', readMovedError);
    }

    // Test 5: Delete the file
    console.log('\n5. Testing file deletion...');
    const deleteResponse = await fetch(`${BASE_URL}/api/blobs/delete?filePath=${encodeURIComponent('test/moved-sample.txt')}`, {
      method: 'DELETE'
    });
    
    const deleteResult = await deleteResponse.json();
    console.log('Delete result:', deleteResult);

    // Test 6: Try to read deleted file
    console.log('\n6. Testing reading deleted file (should fail)...');
    const readDeletedResponse = await fetch(`${BASE_URL}/api/blobs/read?filePath=${encodeURIComponent('test/moved-sample.txt')}`);
    
    const readDeletedResult = await readDeletedResponse.json();
    console.log('Read deleted result:', readDeletedResult);

    console.log('\nAll tests completed!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testBlobFunctions();
