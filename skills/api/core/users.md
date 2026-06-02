<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.mjs -->

# Users API Reference

Source: Kinetic Core REST API v6.1

> Generated from the OpenAPI spec — endpoints + parameters only. For base URLs, authentication, pagination, `include` conventions, and worked examples see `concepts/api-basics`, `api/authentication`, and `api/using-the-api`.

### `GET /users`
**Operation:** `listUsers`
User List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * memberships * attributes[ATTRIBUTE NAME] * attributesMap[ATTRIBUTE NAME] * profileAttributes[ATTRIBUTE NAME] * profileAttri… |
| `count` (boolean) | query | No | If the count query parameter is specified, the server will respond with a count and no results for improved network performance of getting 'counts'. |
| `limit` (integer) | query | No | Limit the number of results returned. If not provided, the server will return the default, maximum limit of `1000` results. **DEPRECATION NOTICE:** Pagination functionality was introduced in versio… |
| `orderBy` (string) | query | No | The user property to order (sort) results by. The orderBy value can be one of the available properties, and that property must also be part of the search qualification. If no `orderBy` parameter is… |
| `direction` (string) | query | No | The direction the results should be ordered. |
| `pageToken` (string) | query | No | The token to get the next page of results. This value is set using the nextPageToken value returned by a search with the same query to get the next page or results. |
| `q` (string) | query | No | Search qualification parameter used to find users within the system. ### Common Example Queries * `q=enabled = "true"` Returns all enabled users in the system. * `q=enabled = "true" AND spaceAdmin … |

**Success response:** 200

---

### `POST /users`
**Operation:** `createUser`
User Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * memberships * attributes[ATTRIBUTE NAME] * attributesMap[ATTRIBUTE NAME] * profileAttributes[ATTRIBUTE NAME] * profileAttri… |

**Request body (required):** The content for the user properties


**Success response:** 200

---

### `GET /users/{username}`
**Operation:** `retrieveUser`
User Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `username` (string) | path | Yes | The username of the user |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * memberships * attributes[ATTRIBUTE NAME] * attributesMap[ATTRIBUTE NAME] * profileAttributes[ATTRIBUTE NAME] * profileAttri… |

**Success response:** 200

---

### `PUT /users/{username}`
**Operation:** `updateUser`
User Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `username` (string) | path | Yes | The username of the user |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * memberships * attributes[ATTRIBUTE NAME] * attributesMap[ATTRIBUTE NAME] * profileAttributes[ATTRIBUTE NAME] * profileAttri… |

**Request body (required):** The content for the user properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /users/{username}`
**Operation:** `deleteUser`
User Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `username` (string) | path | Yes | The username of the user |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * memberships * attributes[ATTRIBUTE NAME] * attributesMap[ATTRIBUTE NAME] * profileAttributes[ATTRIBUTE NAME] * profileAttri… |

**Success response:** 200

---

### `POST /users/{username}/passwordResetToken`
**Operation:** `passwordResetToken`
Password Reset Token Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `username` (string) | path | Yes | The username of the user |

**Request body:** The content for the user properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---
