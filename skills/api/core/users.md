<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Users API Reference

Source: Kinetic Core REST API v6.1

### `GET /users`
**Operation:** `listUsers`
User List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * memberships  * attributes[ATTRIBUTE NAME]  * attributesMap[ATTRIBUTE NAME]  * profileAttributes[ATTRIBUTE NAME]  * profileAttributesMap[ATTRIBUTE NAME]  * space.{any Space include property}  |
| `count` (boolean) | query | No | If the count query parameter is specified, the server will respond with a count and no results for improved network performance of getting 'counts'.  |
| `limit` (integer) | query | No | Limit the number of results returned.  If not provided, the server will return the default, maximum limit of `1000` results.  **DEPRECATION NOTICE:** Pagination functionality was introduced in version 2.4. In order to provide backwards compatibility with previous versions, if you provide the limit parameter, results will be paginated. If you don&#x2019;t provide the limit parameter, the full result will be returned. The ability to return the full result set will be deprecated in a later version in favor of a paginated set of results.  |
| `orderBy` (string) | query | No | The user property to order (sort) results by.  The orderBy value can be one of the available properties, and that property must also be part of the search qualification. If no `orderBy` parameter is passed, the query will be ordered by the first usage of `username`, `email`, `displayName`, `updatedAt` or `createdAt` included in the search qualification. If none of these are used in the search qualification, the results will be ordered by `username`.  |
| `direction` (string) | query | No | The direction the results should be ordered.  |
| `pageToken` (string) | query | No | The token to get the next page of results.  This value is set using the nextPageToken value returned by a search with the same query to get the next page or results.  |
| `q` (string) | query | No | Search qualification parameter used to find users within the system.  ### Common Example Queries  * `q=enabled = "true"`      Returns all enabled users in the system.  * `q=enabled = "true" AND spaceAdmin = "true"`      Returns all enabled users that are also space admins  * `q=enabled = "true" AND spaceAdmin = "true" AND (username =* "joh" OR email =* "joh" OR displayName =* "joh")`      Returns all enabled users that are also space admins who have a username, email, or displayName that start with &#x201c;joh&#x201d;   ### Operators  * `BETWEEN`      left side is between two values - first value is inclusive, second value is exclusive  * `IN`      left side is equal to one of provided items  * `=`      equal  * `=*`      starts with  * `>`      greater than  * `>=`      greater than or equal  * `<`      less than  * `<=`      less than or equal  * `AND`      Returns boolean true if and only if both expressions are true  * `OR`      Returns boolean true if at least one expression is true   ### Queryable Properties  #### The following properties can be used within a search with the `=`, `IN`, `=*` (starts with), `<`, `<=`, `>`, `>=`, and `BETWEEN` operators, however some limitations apply to ensure consistent performance (See Complex Query Limitations below).  * `createdAt`                         (The ISO 8601 time that when the user was created)      *Example:*      * `q=createdAt BETWEEN ("2018-04-16T18:42:56.000Z","2019-04-16T18:42:56.000Z")`  * `displayName`                       (Display Name of the user)      *Example:*      * `q=displayName="John"`  * `email`                             (Email Address of the user)      *Example:*      * `q=email="john@example.com"`  * `updatedAt`                         (The ISO 8601 time that when the user was last updated)      *Example:*      * `q=updatedAt >= "2018-04-16T18:42:56.000Z"`  * `username`                          (Username of the user)      *Example:*      * `q=username IN ("john.doe","mary.manager")`   #### The following properties can _only_ be used within a search with the `=` and `IN` operators, however some limitations apply to ensure consistent performance (See Complex Query Limitations below).  * `enabled`                           (If the user is enabled (`true` or `false`))      *Example:*      * `q=enabled="true"`  * `spaceAdmin`                        (If the user is a Space Admin (`true` or `false`))      *Example:*      * `q=spaceAdmin="false"`  * `attributes[Attribute Name]`        (Attribute Value of a user)      *Example:*      * `q=attributes[Manager]="mary_manager@example.com"`  * `profileAttributes[Attribute Name]` (Profile Attribute Value of a user)      *Example:*      * `q=profileAttributes[Phone Number]="888-446-9292"`   ### Complex Query Limitations  Properties can be combined to create subexpressions within a query qualification, however some limits are enforced to ensure a stable and performant system.  * The `enabled` and `spaceAdmin` properties can only be combined with other subexpressions using the `AND` operator.      Examples of **valid** queries using the `spaceAdmin` and `enabled` properties      * `q=enabled="true" AND spaceAdmin = "false" AND ...`      Examples of **invalid** queries using the `spaceAdmin` and `enabled` properties      * `q=enabled="true" OR spaceAdmin = "false" OR ...`  * Only one `attributes[]` or `profileAttributes[]` property can be used within a search qualification      Examples of **valid** queries using Attributes and Profile Attributes      * `q=displayName="John" AND attributes[FOO] = "Bar"`      * `q=displayName="John" AND profileAttribute[FOO] = "Bar"`      Examples of **invalid** queries using Attributes and Profile Attributes      * `q=displayName="John" AND attributes[FOO] = "Bar" AND attribute[BAZ] = "Bang"`      * `q=displayName="John" AND profileAttributes[FOO] = "Bar" AND profileAttributes[BAZ] = "Bang"`      * `q=displayName="John" AND attributes[FOO] = "Bar" AND profileAttributes[BAZ] = "Bang"`  * When combining the `createdAt`, `displayName`, `email`, `updatedAt` or `username` properties with the `OR` operator, the subexpressions must be surrounded with parentheses `()`. If the subexpressions can not be completed efficiently, an error message will be returned that includes information on how to structure a more efficient query.      Examples of **valid** queries using the `=*` (starts with), `<`, `<=`, `>`, `>=`, and `BETWEEN` operators      * `q=enabled="true" AND (username =* "John" OR email =*john)`      * `q=profileAttributes[Manager]="mary.manager" AND (username =* "John" OR email =*john)`      Examples of **invalid** queries using the `=*` (starts with), `<`, `<=`, `>`, `>=`, and `BETWEEN` operators      * `q=profileAttributes[Manager]="mary.manager" AND username =* "John" OR email =*john`   ### Pagination  The system will paginate search results based on the `limit` parameter.  If there are more results than the `limit` parameter (or more than 1000 results if the limit parameter is not provided), a `nextPageToken` will be included in the response.  The `nextPageToken` value can be passed as the `pageToken` parameter in subsequent queries to obtain the next page of results.  **DEPRECATION NOTICE:** Pagination functionality was introduced in version 2.4. In order to provide backwards compatibility with previous versions, if you provide the limit parameter, results will be paginated. If you don&#x2019;t provide the limit parameter, the full result will be returned. The ability to return the full result set will be deprecated in a later version in favor of a paginated set of results.   Example Response with a next page token  ```javascript {   "users": [{...}, {...}],   "nextPageToken": "YWJib3R0LmRldmFuQHRoaWVsLm9yZw.4wg2me95blthjyzdvkfs56oc3" } ```  |

**Success response:** 200

---

### `POST /users`
**Operation:** `createUser`
User Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * memberships  * attributes[ATTRIBUTE NAME]  * attributesMap[ATTRIBUTE NAME]  * profileAttributes[ATTRIBUTE NAME]  * profileAttributesMap[ATTRIBUTE NAME]  * space.{any Space include property}  |

**Request body (required):** The content for the user properties


**Success response:** 200

---

### `GET /users/{username}`
**Operation:** `retrieveUser`
User Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `username` (string) | path | Yes | The username of the user  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * memberships  * attributes[ATTRIBUTE NAME]  * attributesMap[ATTRIBUTE NAME]  * profileAttributes[ATTRIBUTE NAME]  * profileAttributesMap[ATTRIBUTE NAME]  * space.{any Space include property}  |

**Success response:** 200

---

### `PUT /users/{username}`
**Operation:** `updateUser`
User Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `username` (string) | path | Yes | The username of the user  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * memberships  * attributes[ATTRIBUTE NAME]  * attributesMap[ATTRIBUTE NAME]  * profileAttributes[ATTRIBUTE NAME]  * profileAttributesMap[ATTRIBUTE NAME]  * space.{any Space include property}  |

**Request body (required):** The content for the user properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /users/{username}`
**Operation:** `deleteUser`
User Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `username` (string) | path | Yes | The username of the user  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * memberships  * attributes[ATTRIBUTE NAME]  * attributesMap[ATTRIBUTE NAME]  * profileAttributes[ATTRIBUTE NAME]  * profileAttributesMap[ATTRIBUTE NAME]  * space.{any Space include property}  |

**Success response:** 200

---

### `POST /users/{username}/passwordResetToken`
**Operation:** `passwordResetToken`
Password Reset Token Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `username` (string) | path | Yes | The username of the user  |

**Request body:** The content for the user properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---
