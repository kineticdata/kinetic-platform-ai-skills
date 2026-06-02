<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.mjs -->

# Submissions API Reference

Source: Kinetic Core REST API v6.1

> Generated from the OpenAPI spec — endpoints + parameters only. For base URLs, authentication, pagination, `include` conventions, and worked examples see `concepts/api-basics`, `api/authentication`, and `api/using-the-api`.

### `GET /kapps/{kappSlug}/forms/{formSlug}/submissions`
**Operation:** `listFormSubmissions`
Submission Search (by Form)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |
| `count` (string) | query | No | Include a count of the number of submissions that match the search parameters in the result. |
| `direction` (string) | query | No | The direction to order the results |
| `limit` (integer) | query | No | Limit the number of results returned. If not provided, the server will limit the results to 25 submissions. |
| `orderBy` (string) | query | No | Comma separated list of submission properties and fields to sort the response by. The orderBy list: * May start with any combination of zero or more items that are used in query equality subexpress… |
| `pageToken` (string) | query | No | The token to get the next page of results. This value is set using the nextPageToken value returned by a search with the same query to get the next page of results. The submission that matches this… |
| `q` (string) | query | No | A custom qualification that can be constructed similar to a SQL `WHERE` clause that allows building complex expressions using logical and relational operators against submission properties and fiel… |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms/{formSlug}/submissions`
**Operation:** `createSubmission`
Submission Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |
| `completed` (boolean) | query | No | signals that the submission should be completed (equivalent of submitting all of the pages at once) |
| `page` (string) | query | No | The name of the Page being submitted. |
| `staged` (boolean) | query | No | Indicates whether field validations and page advancement should take place. |
| `defer` (boolean) | query | No | Indicates the submission is for a subform embedded in a parent submission. |

**Request body (required):** The content for the submission properties


**Success response:** 200

---

### `PATCH /kapps/{kappSlug}/forms/{formSlug}/submissions`
**Operation:** `patchNewSubmission`
Submission Patch (new)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |

**Request body (required):** The content for the submission properties


**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms/{formSlug}/submissions-multipart`
**Operation:** `createSubmissionMultipart`
Submission Create (with Attachments)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |
| `completed` (boolean) | query | No | signals that the submission should be completed (equivalent of submitting all of the pages at once) |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms/{formSlug}/submissions-search`
**Operation:** `listFormSubmissionsAsPost`
Submission Search (by Form as POST)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |

**Request body (required):** The content for the submissions search


**Success response:** 200

---

### `GET /kapps/{kappSlug}/submissions`
**Operation:** `listKappSubmissions`
Submissions Search (by Kapp)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |
| `count` (string) | query | No | Include a count of the number of submissions that match the search parameters in the result. |
| `direction` (string) | query | No | The direction to order the results |
| `limit` (integer) | query | No | Limit the number of results returned. If not provided, the server will limit the results to 25 submissions. |
| `orderBy` (string) | query | No | Comma separated list of submission properties and fields to sort the response by. The orderBy list: * May start with any combination of zero or more items that are used in query equality subexpress… |
| `pageToken` (string) | query | No | The token to get the next page of results. This value is set using the nextPageToken value returned by a search with the same query to get the next page of results. The submission that matches this… |
| `q` (string) | query | No | A custom qualification that can be constructed similar to a SQL `WHERE` clause that allows building complex expressions using logical and relational operators against submission properties and fiel… |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/submissions-search`
**Operation:** `listKappSubmissionsAsPost`
Submissions Search (by Kapp as POST)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |

**Request body (required):** The content for the submissions search


**Success response:** 200

---

### `POST /submissions-multipart/{submissionId}`
**Operation:** `updateSubmissionMultipart`
Submission Update (with Attachments)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission |
| `completed` (boolean) | query | No | signals that the submission should be completed (equivalent of submitting all of the pages at once) |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |

**Success response:** 200

---

### `GET /submissions/{submissionId}`
**Operation:** `retrieveSubmission`
Submission Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |

**Success response:** 200

---

### `POST /submissions/{submissionId}`
**Operation:** `submitSubmissionPage`
Submission Submit

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |
| `page` (string) | query | No | The name of the Page being submitted. |
| `staged` (boolean) | query | No | Indicates whether field validations and page advancement should take place. |
| `defer` (boolean) | query | No | Indicates the submission is for a subform embedded in a parent submission. |

**Request body (required):** The content for the submission properties


**Success response:** 200

---

### `PUT /submissions/{submissionId}`
**Operation:** `updateSubmission`
Submission Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |

**Request body (required):** The content for the submission properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `PATCH /submissions/{submissionId}`
**Operation:** `patchExistingSubmission`
Submission Patch (existing)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |

**Request body (required):** The content for the submission properties


**Success response:** 200

---

### `DELETE /submissions/{submissionId}`
**Operation:** `deleteSubmission`
Submission Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |

**Success response:** 200

---

### `GET /submissions/{submissionId}/activities`
**Operation:** `listSubmissionActivities`
Submission Activity List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details |

**Success response:** 200

---

### `POST /submissions/{submissionId}/activities`
**Operation:** `createSubmissionActivity`
Submission Activity Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details |

**Request body (required):** The content for the submission activity properties


**Success response:** 200

---

### `POST /submissions/{submissionId}/clone`
**Operation:** `cloneSubmission`
Submission Clone

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission |
| `completed` (boolean) | query | No | signals that the submission should be completed (equivalent of submitting all of the pages at once) |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |

**Success response:** 200

---

### `GET /submissions/{submissionId}/files/{fieldName}/{fileIndex}/{fileName}/url`
**Operation:** `retrieveSubmissionFileUrl`
Submission Attachment File URL Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission |
| `fieldName` (string) | path | Yes | Name of the field the file attachment was submitted for. |
| `fileIndex` (integer) | path | Yes | The index in the array of attachments for the field. This value will always be 0 for File fields that only allow a single value. |
| `fileName` (string) | path | Yes | Name of the file that was attached to the field. |

**Success response:** 200

---

### `PUT /submissions/{submissionId}/reindex`
**Operation:** `reindexSubmissions`
Reindex Submissions

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * activities * children * descendants * origin * parent * type * values * values.raw * values[FIELD NAME] * form * form.{any … |

**Success response:** 200

---
