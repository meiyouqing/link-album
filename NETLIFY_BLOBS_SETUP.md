# Netlify Blobs Integration for LinkAlbum

This document explains how to use the new Netlify Blobs functionality for file storage in LinkAlbum.

## Overview

LinkAlbum now supports Netlify Blobs as a storage backend in addition to the existing S3 and filesystem storage options. Netlify Blobs provides:

- Serverless file storage
- Automatic scaling
- Global CDN distribution
- Simple pricing model
- No infrastructure management

## Configuration

To enable Netlify Blobs storage, set the following environment variables:

```bash
# Enable Netlify Blobs
USE_NETLIFY_BLOBS=true

# Your Netlify Site ID (automatically set in Netlify deployments)
NETLIFY_SITE_ID=d06490d5-32fd-4c46-a6d4-75645e45abbb

# Optional: Override the default site ID if needed
SITE_ID=d06490d5-32fd-4c46-a6d4-75645e45abbb
```

### Environment Variables in Netlify

In your Netlify dashboard:

1. Go to **Site settings** → **Environment variables**
2. Add the following variables:
   - `USE_NETLIFY_BLOBS`: `true`
   - `NETLIFY_SITE_ID`: `d06490d5-32fd-4c46-a6d4-75645e45abbb`

The `NETLIFY_SITE_ID` is automatically available in Netlify deployments, but you can set it explicitly if needed.

## Storage Backends Priority

The storage system will use backends in this order:

1. **Netlify Blobs** (if `USE_NETLIFY_BLOBS=true` and `NETLIFY_SITE_ID` is set)
2. **S3/DigitalOcean Spaces** (if S3 credentials are configured)
3. **Local Filesystem** (fallback)

## Features Supported

### ✅ Fully Supported
- ✅ File upload (images, PDFs)
- ✅ File reading/serving
- ✅ File deletion
- ✅ File moving/renaming
- ✅ Folder creation (no-op, but compatible)
- ✅ Content type detection
- ✅ Metadata storage

### ⚠️ Partially Supported
- ⚠️ Folder deletion (limited - see limitations below)

### ❌ Limitations
- ❌ Bulk folder operations (Netlify Blobs doesn't have native listing)
- ❌ File listing by prefix (would require maintaining a separate index)

## API Endpoints

The integration includes Netlify Functions for direct blob operations:

### Upload File
```
POST /.netlify/functions/blobs/upload
Content-Type: multipart/form-data

FormData:
- file: File object
- filePath: string (e.g., "archives/123/456.jpg")
```

### Read File
```
GET /.netlify/functions/blobs/read?filePath=archives/123/456.jpg
```

### Delete File
```
DELETE /.netlify/functions/blobs/delete?filePath=archives/123/456.jpg
```

### Move File
```
POST /.netlify/functions/blobs/move
Content-Type: application/json

{
  "fromPath": "archives/123/456.jpg",
  "toPath": "archives/124/456.jpg"
}
```

## File Structure

Files are stored in Netlify Blobs with the same path structure as the original implementation:

```
archives/
├── {collectionId}/
│   ├── {linkId}.pdf
│   ├── {linkId}.jpg
│   ├── {linkId}.png
│   ├── {linkId}.html
│   └── {linkId}_readability.json
├── preview/
│   └── {collectionId}/
│       └── {linkId}.jpeg
└── uploads/
    └── avatar/
        └── {userId}.jpg
```

## Migration from S3/Filesystem

To migrate from existing S3 or filesystem storage to Netlify Blobs:

1. **No automatic migration** - New files will be stored in Netlify Blobs
2. **Existing files** remain in their current storage (S3/filesystem)
3. **Hybrid mode** - The system will continue to serve existing files from their original storage

For a complete migration, you would need to:

1. Export existing files from S3/filesystem
2. Upload them to Netlify Blobs using the upload function
3. Update database references if needed

## Development and Testing

### Local Development

When developing locally, you can:

1. **Test with filesystem storage** (default when no Netlify environment)
2. **Mock Netlify environment** by setting environment variables
3. **Use Netlify CLI** for local testing of functions

### Netlify CLI Testing

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run local development server
netlify dev

# Test functions locally
netlify functions:serve
```

## Troubleshooting

### Common Issues

1. **Files not found after enabling Netlify Blobs**
   - Check that `USE_NETLIFY_BLOBS=true` and `NETLIFY_SITE_ID` are set
   - Verify the site ID matches your Netlify site

2. **Upload failures**
   - Check file size limits (5MB default in LinkAlbum)
   - Verify content types are supported
   - Check browser console for errors

3. **Function timeout errors**
   - Netlify Functions have a 10-second timeout on Hobby plan
   - Large files may need to be handled differently

### Debug Mode

To enable debug logging, check the Netlify Functions logs:

1. Go to Netlify dashboard
2. Navigate to **Functions** tab
3. View function logs for error details

## Performance Considerations

### Advantages
- **Global CDN**: Files are automatically distributed globally
- **Serverless**: No infrastructure to manage
- **Scalable**: Automatically handles traffic spikes

### Considerations
- **Cold starts**: Functions may have slight delay on first request
- **File size limits**: Netlify has limits on function payloads
- **Request limits**: Functions have execution time limits

## Cost Comparison

| Storage Type | Pros | Cons |
|-------------|------|------|
| **Netlify Blobs** | Simple setup, global CDN, integrated with Netlify | Function execution costs, file size limits |
| **S3/Spaces** | Mature, unlimited file sizes, flexible pricing | Requires configuration, separate CDN setup |
| **Filesystem** | Free, simple | Not scalable, single server, no CDN |

## Next Steps

1. **Enable Netlify Blobs** by setting environment variables
2. **Test file uploads** to ensure everything works
3. **Monitor usage** in Netlify dashboard
4. **Consider migration** of existing files if needed

For questions or issues, check the Netlify Blobs documentation: https://docs.netlify.com/blobs/overview/
