<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Teams API Reference

Source: Kinetic Core REST API v6.1

### `GET /teams`
**Operation:** `listTeams`
Team List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes[ATTRIBUTE NAME]  * attributesMap[ATTRIBUTE NAME]  * memberships  |
| `count` (boolean) | query | No | If the count query parameter is specified, the server will respond with a count and no results for improved network performance of getting 'counts'.  |
| `archived` (boolean) | query | No | list archive teams  |
| `limit` (integer) | query | No | Limit the number of results returned.  If not provided, the server will return the default, maximum limit of `1000` results.  **DEPRECATION NOTICE:** Pagination functionality was introduced in version 2.4. In order to provide backwards compatibility with previous versions, if you provide the limit parameter, results will be paginated. If you don't provide the limit parameter, the full result will be returned. The ability to return the full result set will be deprecated in a later version in favor of a paginated set of results.  |
| `orderBy` (string) | query | No | The team property to order (sort) results by.  This order by value can be one of the allowed properties, and that property must also be part of the search qualification.  If no `orderBy` parameter is passed, the query will be ordered by the first usage of `name`, `localName`, `updatedAt` or `createdAt` included in the search qualification. If none of these are used in the search qualification, the results will be ordered by `name`.  |
| `direction` (string) | query | No | The direction the results should be ordered by; ascending or descending.  |
| `pageToken` (string) | query | No | The token to get the next page of results. This value is set using the nextPageToken value returned by a search with the same query to get the next page or results.  |
| `q` (string) | query | No | Search qualification parameter used to find teams within the system.   #### Common Example Queries  * `q=name =* "HR"`      Returns all teams in the system have a full name starting with "HR" (ie "HR", "HR::Benefits", "HR::Benefits::Administrators", and "HR-IT")  * `q=name =* "HR::"`      Returns all teams in the system that are descendants of the HR team (ie "HR::Benefits" and "HR::Benefits::Administrators")  * `q=parentName = "HR"`      Returns all teams in the system with a parent team of HR (ie "HR::Benefits").  * `q=attributes[Assignable] = "True" AND name =* "HR::"`      Returns all teams in the system with that are a decendant of HR and how have an "Assignable" attribute value of "True"   #### Operators:  * `BETWEEN`      left side is between two values - first value is inclusive, second value is exclusive  * `IN`      left side is equal to one of provided items  * `=`      equal  * `=*`      starts with  * `>`      greater than  * `>=`      greater than or equal  * `<`      less than  * `<=`      less than or equal  * `AND`      Returns boolean true if and only if both expressions are true  * `OR`      Returns boolean true if at least one expression is true   #### Queryable Properties  ##### The following properties can be used within a search with the `=`, `IN`, `=*` (starts with), `<`, `<=`, `>`, `>=`, and `BETWEEN` operators, however some limitations apply to ensure consistent performance (See Complex Query Limitations below).  * `createdAt`                         (The ISO 8601 time that when the team was created)      *Example:*                        `q=createdAt BETWEEN ("2018-04-16T18:42:56.000Z","2019-04-16T18:42:56.000Z")`  * `localName`                         (Local name of the team)      *Example:*                        `q=localName="Employees"`  * `name`                              (Name of the team)      *Example:*                        `q=name="HR::Employees"`  * `updatedAt`                         (The ISO 8601 time that when the team was last updated)      *Example:*                        `q=updatedAt >= "2018-04-16T18:42:56.000Z"`   ##### The following properties can _only_ be used within a search with the `=` and `IN` operators, however some limitations apply to ensure consistent performance (See Complex Query Limitations below).  * `parentName`                        (The parent name of the team)      *Example:*                        `q=parentName="HR"`  * `attributes[Attribute Name]`        (Attribute Value of a team)      *Example:*                        `q=attributes[Icon]="fa-fork"`   #### Complex Query Limitations  Properties can be combined to create subexpressions within a query qualification, however some limits are enforced to ensure a stable and performant system.  * The `parentName` property can only be combined with other subexpressions using the `AND` operator.      * Examples of **valid** queries using the `parentName` property          `q=parentName="HR" AND ...`      * Examples of **invalid** queries using the `parentName` property          `q=parentName="HR" OR ...`  * Only one `attributes[]` property can be used within a search qualification      * Examples of **valid** queries using Attributes          `q=parentName="HR" AND attributes[FOO] = "Bar"`      * Examples of **invalid** queries using Attributes          `q=parentName="HR" AND attributes[FOO] = "Bar" AND attribute[BAZ] = "Bang"`  * When combining the `createdAt`, `localName`, `name`, or `updatedAt` properties with the `OR` operator, the subexpressions must be surrounded with parentheses `()`. If the subexpressions can not be completed efficiently, an error message will be returned that includes information on how to structure a more efficient query.      * Examples of **valid** queries using the `=*` (starts with), `<`, `<=`, `>`, `>=`, and `BETWEEN` operators          `q=enabled="true" AND (name =* "employees" OR localName =*employees)`          `q=attributes[Manager]="mary.manager" AND (name =* "employees" OR localName =*employees)`      * Examples of **invalid** queries using the `=*` (starts with), `<`, `<=`, `>`, `>=`, and `BETWEEN` operators          `q=attributes[Manager]="mary.manager" AND name =* "employees" OR localName =*employees`   #### Pagination  The system will paginate search results based on the `limit` parameter.  If there are more results than the `limit` parameter (or more than 1000 results if the limit parameter is not provided), a `nextPageToken` will be included in the response.  The `nextPageToken` value can be passed as the `pageToken` parameter in subsequent queries to obtain the next page of results.  **DEPRECATION NOTICE:** Pagination functionality was introduced in version 2.4. In order to provide backwards compatibility with previous versions, if you provide the limit parameter, results will be paginated. If you don't provide the limit parameter, the full result will be returned. The ability to return the full result set will be deprecated in a later version in favor of a paginated set of results.  Example Response with a next page token: ```javascript {   "teams": [{...}, {...}],   "nextPageToken": "YWJib3R0LmRldmFuQHRoaWVsLm9yZw.4wg2me95blthjyzdvkfs56oc3" } ```  |

**Success response:** 200

---

### `POST /teams`
**Operation:** `createTeam`
Team Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes[ATTRIBUTE NAME]  * attributesMap[ATTRIBUTE NAME]  * memberships  |
| `restorationToken` (string) | query | No | the archived team's restoration token  |

**Request body (required):** The content for the team properties


**Success response:** 200

---

### `GET /teams/{slug}`
**Operation:** `retrieveTeam`
Team Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `slug` (string) | path | Yes | The slug of the team  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes[ATTRIBUTE NAME]  * attributesMap[ATTRIBUTE NAME]  * memberships  |
| `export` (boolean) | query | No | flag indicating the API should export all child components of the team.  |

**Success response:** 200

---

### `PUT /teams/{slug}`
**Operation:** `updateTeam`
Team Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `slug` (string) | path | Yes | The slug of the team  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes[ATTRIBUTE NAME]  * attributesMap[ATTRIBUTE NAME]  * memberships  |

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
| `slug` (string) | path | Yes | The slug of the team  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes[ATTRIBUTE NAME]  * attributesMap[ATTRIBUTE NAME]  * memberships  |

**Success response:** 200

---
