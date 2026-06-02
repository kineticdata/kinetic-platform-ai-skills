<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.mjs -->

# Teams API Reference

Source: Kinetic Core REST API v6.1

> Generated from the OpenAPI spec — endpoints + parameters only. For base URLs, authentication, pagination, `include` conventions, and worked examples see `concepts/api-basics`, `api/authentication`, and `api/using-the-api`.

### `GET /teams`
**Operation:** `listTeams`
Team List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes[ATTRIBUTE NAME] * attributesMap[ATTRIBUTE NAME] * memberships |
| `count` (boolean) | query | No | If the count query parameter is specified, the server will respond with a count and no results for improved network performance of getting 'counts'. |
| `archived` (boolean) | query | No | list archive teams |
| `limit` (integer) | query | No | Limit the number of results returned. If not provided, the server will return the default, maximum limit of `1000` results. **DEPRECATION NOTICE:** Pagination functionality was introduced in versio… |
| `orderBy` (string) | query | No | The team property to order (sort) results by. This order by value can be one of the allowed properties, and that property must also be part of the search qualification. If no `orderBy` parameter is… |
| `direction` (string) | query | No | The direction the results should be ordered by; ascending or descending. |
| `pageToken` (string) | query | No | The token to get the next page of results. This value is set using the nextPageToken value returned by a search with the same query to get the next page or results. |
| `q` (string) | query | No | Search qualification parameter used to find teams within the system. #### Common Example Queries * `q=name =* "HR"` Returns all teams in the system have a full name starting with "HR" (ie "HR", "HR… |

**Success response:** 200

---

### `POST /teams`
**Operation:** `createTeam`
Team Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes[ATTRIBUTE NAME] * attributesMap[ATTRIBUTE NAME] * memberships |
| `restorationToken` (string) | query | No | the archived team's restoration token |

**Request body (required):** The content for the team properties


**Success response:** 200

---

### `GET /teams/{slug}`
**Operation:** `retrieveTeam`
Team Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `slug` (string) | path | Yes | The slug of the team |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes[ATTRIBUTE NAME] * attributesMap[ATTRIBUTE NAME] * memberships |
| `export` (boolean) | query | No | flag indicating the API should export all child components of the team. |

**Success response:** 200

---

### `PUT /teams/{slug}`
**Operation:** `updateTeam`
Team Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `slug` (string) | path | Yes | The slug of the team |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes[ATTRIBUTE NAME] * attributesMap[ATTRIBUTE NAME] * memberships |

**Request body (required):** The content for the team properties to update

User memberships can be specified by including a `"memberships":[]` property in the body, but this list is inclusive of all users. This means if any user memberships already exist, then they must be included in this list.  If any existing memberships are excluded from the list, those memberships will be deleted.

**NOTE** All properties in the request body are optional, and only the properties supplied will be updated.

**The current user must have Space management privileges to perform this action.**


**Success response:** 200

---

### `DELETE /teams/{slug}`
**Operation:** `deleteTeam`
Team Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `slug` (string) | path | Yes | The slug of the team |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes[ATTRIBUTE NAME] * attributesMap[ATTRIBUTE NAME] * memberships |

**Success response:** 200

---
