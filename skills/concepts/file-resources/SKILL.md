---
name: file-resources
description: "Use when streaming files from an external system (S3, SharePoint, CMS, legacy DMS) through the Kinetic UI via File Resources — distinct from the built-in `attachment` form-field type used for uploading files to a submission. Covers the File Adapter → File Resource → frontend architecture and when to choose File Resources vs the attachment field."
---

# File Resources

File Resources stream files from external systems into the Kinetic UI. They are conceptually similar to Bridges but are optimized for binary/file content rather than data payloads.

> **Different from form attachment fields.** Submission file uploads use the built-in `attachment` field type and the multipart submission endpoint — not File Resources. See `concepts/form-engine` for attachment fields and `api/core` for `submissions-multipart`. File Resources are exclusively for *external* files exposed through the platform.

## Architecture

```
File Adapter (Java code, installed on Kinetic Agent)
  → File Resource (configured instance with connection info)
    → Streams files to the frontend via Kinetic Core
```

## Components

**File Adapter** — Java program that knows how to fetch files from a specific external system (S3, SharePoint, etc.). Installed on the Kinetic Agent harness.

**File Resource** — A configured instance of an adapter. Stores URL, credentials, bucket/site/path bindings. Created in the Space console.

**Permissioning** — File Resources are exposed via a security policy; users who can view the policy-protected resource can stream files through it. See `concepts/security-policies`.

## Use Cases

- Displaying knowledge articles from an external CMS inside a service portal
- Streaming files from S3 or SharePoint inline in a form
- Serving documents from legacy document management systems without copying them into Kinetic

## When NOT to Use

For standard file upload/download on forms — uploading a screenshot to a ticket, attaching a PDF to a request — use the built-in `attachment` field type. File Resources are for *external* read paths, not user-uploaded content.

## API Endpoints

```
GET /app/api/v1/fileResources             # List
POST /app/api/v1/fileResources            # Create
GET/PUT/DELETE /app/api/v1/fileResources/{name}
```

Body shape mirrors Bridges — adapter selection, connection properties, and security policy assignments.

## Related Skills

- **`concepts/form-engine`** — for `attachment` field type (form-side upload).
- **`api/core`** — `submissions-multipart` endpoint for submitting forms with attachments.
- **`concepts/integrations`** — broader integration mechanism overview.
- **`concepts/models`** — Bridges (the data-streaming cousin to File Resources).
