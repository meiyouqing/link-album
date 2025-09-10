# Netlify Blobs Configuration Fix

## Problem
You were experiencing a `MissingBlobsEnvironmentError` when using Netlify Blobs in your functions:

```
MissingBlobsEnvironmentError: The environment has not been configured to use Netlify Blobs. To use it manually, supply the following properties when creating a store: siteID, token
```

## Root Cause
The issue was caused by manually specifying `siteID` and `token` parameters in the `getStore()` function calls. According to Netlify documentation, when running in Netlify Functions or Edge Functions, these parameters should be auto-populated by the Netlify runtime and should not be manually provided.

## Files Fixed

### 1. `/netlify/functions/process-link.mjs`
**Before:**
```javascript
const fileStore = getStore({
  name: 'link-album-files',
  siteID: process.env.NETLIFY_SITE_ID,
  token: process.env.NETLIFY_BLOBS_TOKEN
});
```

**After:**
```javascript
// When running in Netlify Functions, siteID and token are auto-populated
const fileStore = getStore({
  name: 'link-album-files'
});
```

### 2. `/netlify/functions/get-archive.js`
**Before:**
```javascript
return getStore({
  name: 'link-album-files',
  siteID: process.env.NETLIFY_SITE_ID,
  token: process.env.NETLIFY_BLOBS_TOKEN
});
```

**After:**
```javascript
// When running in Netlify Functions, siteID and token are auto-populated
return getStore({
  name: 'link-album-files'
});
```

### 3. `/lib/api/storage/netlifyBlobsClient.ts`
**Before:**
```typescript
return getStore({
  name: 'link-album-files',
  siteID: process.env.NETLIFY_SITE_ID,
  token: process.env.NETLIFY_BLOBS_TOKEN
});
```

**After:**
```typescript
// When running in Netlify Functions, siteID and token are auto-populated
return getStore({
  name: 'link-album-files'
});
```

### 4. `/netlify.toml`
Removed the manual `NETLIFY_SITE_ID` environment variable configuration since it's auto-populated in the Netlify Functions runtime.

**Before:**
```toml
# Netlify Blobs Configuration
USE_NETLIFY_BLOBS = "true"
NETLIFY_SITE_ID = "d06490d5-32fd-4c46-a6d4-75645e45abbb"
```

**After:**
```toml
# Netlify Blobs is enabled by default in Functions - no manual configuration needed
USE_NETLIFY_BLOBS = "true"
```

### 5. Updated Environment Detection Logic
Improved the `shouldUseNetlifyBlobs()` function to better detect Netlify environments:

```typescript
const isNetlifyEnvironment = process.env.NETLIFY === "true" || 
                           !!process.env.NETLIFY_SITE_ID || 
                           !!process.env.SITE_ID;
```

## Key Points

1. **Auto-Population**: In Netlify Functions and Edge Functions, the `siteID` and `token` are automatically injected by the runtime. You should NOT provide them manually.

2. **Only Provide Store Name**: When calling `getStore()`, only provide the `name` parameter for your blob store.

3. **Local Development**: If you need to test locally outside of Netlify's environment, you would need to manually provide these parameters, but this is typically not needed for production deployments.

4. **Environment Variables**: The `NETLIFY_SITE_ID` environment variable is still available for detection purposes, but shouldn't be manually passed to `getStore()`.

## Testing
After deploying these changes, your Netlify Functions should be able to use Netlify Blobs without the `MissingBlobsEnvironmentError`. The Netlify runtime will automatically provide the necessary authentication credentials.

## References
- [Netlify Blobs Documentation](https://docs.netlify.com/platform/primitives/blobs/)
- [Netlify Functions Environment Variables](https://docs.netlify.com/functions/environment-variables/)
