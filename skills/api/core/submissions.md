<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Submissions API Reference

Source: Kinetic Core REST API v6.1

### `GET /kapps/{kappSlug}/forms/{formSlug}/submissions`
**Operation:** `listFormSubmissions`
Submission Search (by Form)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |
| `count` (string) | query | No | Include a count of the number of submissions that match the search parameters in the result.  |
| `direction` (string) | query | No | The direction to order the results  |
| `limit` (integer) | query | No | Limit the number of results returned.  If not provided, the server will limit the results to 25 submissions.  |
| `orderBy` (string) | query | No | Comma separated list of submission properties and fields to sort the response by.  The orderBy list:  * May start with any combination of zero or more items that are used in query equality subexpressions (`=` or `IN`). * May continue with the item used in the query range subexpressions (`=*`, `>`, `>=`, `<`, `<=`, `BETWEEN`).  This item is required if a range subexpression is used and any further items are added to the orderBy list. * May continue with any combination of zero or more items that are not used in the query, but are specified as index parts in the same order and after any parts used by equality or range subexpressions. * May end with a single submission timeline fields (`createdAt`, `updatedAt`, `submittedAt`, `closedAt`).  If the timeline is not specified, `createdAt` is used as the default tie breaker.  All parts of the orderBy except the optionally specified timeline must be included in all indexes used by the query.  Example: values[Make],values[Model],values[Year],updatedAt  |
| `pageToken` (string) | query | No | The token to get the next page of results.  This value is set using the nextPageToken value returned by a search with the same query to get the next page of results.  The submission that matches this value will not be included in the results.  |
| `q` (string) | query | No | A custom qualification that can be constructed similar to a SQL `WHERE` clause that allows building complex expressions using logical and relational operators against submission properties and field values.  In order to execute a submission search, there must be one or more index definitions that correspond to the specified submission properties and field values.  Only a single property or field can be specified using a range subexpression.   ### Operators  * `AND`    Returns boolean true if and only if both expressions are true    Example: expression1 AND expression2  * `OR`    Returns boolean true if at least one expression is true    Example: expression1 OR expression2  * `IN` *equality subexpression*    Returns boolean true if the key matches one of the list values    Example: key IN ("Value One", "Value Two", "Value Three")  * `=` *equality subexpression*    Returns boolean true if the key is exactly equal to the value.    Example: key = "Test Value"  * `BETWEEN` *range subexpression*    left side is between two values - first value is inclusive, second value is exclusive    Example: key BETWEEN ("Value One", "Value Two")  * `=*` *range subexpression*    starts with  * `>` *range subexpression*    greater than  * `>=` *range subexpression*    greater than or equal  * `<` *range subexpression*    less than  * `<=` *range subexpression*    less than or equal  ### Expression Symbols  * `null`    Means no value    Example: key = null  * `(`    Left parentheses for logic grouping, MUST be used with right parentheses    Example: (key = "Value 1" OR key = "Value Two")  * `)`    Right parentheses for logic grouping, MUST be used with left parentheses    Example: (key = "Value 1" OR key = "Value Two")   ### Submission Properties  These are the items that can be specified in the query subexpression.  * `closedBy`    Username that closed the submission  * `coreState`    The value of the core state the submission is in ("Draft", "Submitted", or "Closed")  * `createdBy`    Username that created the submission  * `handle`    A "nearly-unique" identifier for the submission  * `sessionToken`    Used for anonymous submissions  * `submittedBy`    Username that submitted the submission  * `type`    The type of form the submission is associated to  * `updatedBy`    Username that last updated the submission  * `values`    Any field that is implemented by the Form.    Example: the field named 'Approver' would be referred as `values[Approver]`   #### Example Qualifications  ``` (values[Requested By] = "john.doe" OR values[Requested For] = "john.doe")   AND values[Status] IN ("Pending Assignment", "On Hold") ```  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms/{formSlug}/submissions`
**Operation:** `createSubmission`
Submission Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |
| `completed` (boolean) | query | No | signals that the submission should be completed (equivalent of submitting all of the pages at once)  |
| `page` (string) | query | No | The name of the Page being submitted.  |
| `staged` (boolean) | query | No | Indicates whether field validations and page advancement should take place.  |
| `defer` (boolean) | query | No | Indicates the submission is for a subform embedded in a parent submission.  |

**Request body (required):** The content for the submission properties


**Success response:** 200

---

### `PATCH /kapps/{kappSlug}/forms/{formSlug}/submissions`
**Operation:** `patchNewSubmission`
Submission Patch (new)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Request body (required):** The content for the submission properties


**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms/{formSlug}/submissions-multipart`
**Operation:** `createSubmissionMultipart`
Submission Create (with Attachments)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `completed` (boolean) | query | No | signals that the submission should be completed (equivalent of submitting all of the pages at once)  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms/{formSlug}/submissions-search`
**Operation:** `listFormSubmissionsAsPost`
Submission Search (by Form as POST)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Request body (required):** The content for the submissions search


**Success response:** 200

---

### `GET /kapps/{kappSlug}/submissions`
**Operation:** `listKappSubmissions`
Submissions Search (by Kapp)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |
| `count` (string) | query | No | Include a count of the number of submissions that match the search parameters in the result.  |
| `direction` (string) | query | No | The direction to order the results  |
| `limit` (integer) | query | No | Limit the number of results returned.  If not provided, the server will limit the results to 25 submissions.  |
| `orderBy` (string) | query | No | Comma separated list of submission properties and fields to sort the response by.  The orderBy list:  * May start with any combination of zero or more items that are used in query equality subexpressions (`=` or `IN`). * May continue with the item used in the query range subexpressions (`=*`, `>`, `>=`, `<`, `<=`, `BETWEEN`).  This item is required if a range subexpression is used and any further items are added to the orderBy list. * May continue with any combination of zero or more items that are not used in the query, but are specified as index parts in the same order and after any parts used by equality or range subexpressions. * May end with a single submission timeline fields (`createdAt`, `updatedAt`, `submittedAt`, `closedAt`).  If the timeline is not specified, `createdAt` is used as the default tie breaker.  All parts of the orderBy except the optionally specified timeline must be included in all indexes used by the query.  Example: values[Make],values[Model],values[Year],updatedAt  |
| `pageToken` (string) | query | No | The token to get the next page of results.  This value is set using the nextPageToken value returned by a search with the same query to get the next page of results.  The submission that matches this value will not be included in the results.  |
| `q` (string) | query | No | A custom qualification that can be constructed similar to a SQL `WHERE` clause that allows building complex expressions using logical and relational operators against submission properties and field values.  In order to execute a submission search, there must be one or more index definitions that correspond to the specified submission properties and field values.  Only a single property or field can be specified using a range subexpression.   ### Operators  * `AND`    Returns boolean true if and only if both expressions are true    Example: expression1 AND expression2  * `OR`    Returns boolean true if at least one expression is true    Example: expression1 OR expression2  * `IN` *equality subexpression*    Returns boolean true if the key matches one of the list values    Example: key IN ("Value One", "Value Two", "Value Three")  * `=` *equality subexpression*    Returns boolean true if the key is exactly equal to the value.    Example: key = "Test Value"  * `BETWEEN` *range subexpression*    left side is between two values - first value is inclusive, second value is exclusive    Example: key BETWEEN ("Value One", "Value Two")  * `=*` *range subexpression*    starts with  * `>` *range subexpression*    greater than  * `>=` *range subexpression*    greater than or equal  * `<` *range subexpression*    less than  * `<=` *range subexpression*    less than or equal  ### Expression Symbols  * `null`    Means no value    Example: key = null  * `(`    Left parentheses for logic grouping, MUST be used with right parentheses    Example: (key = "Value 1" OR key = "Value Two")  * `)`    Right parentheses for logic grouping, MUST be used with left parentheses    Example: (key = "Value 1" OR key = "Value Two")   ### Submission Properties  These are the items that can be specified in the query subexpression.  * `closedBy`    Username that closed the submission  * `coreState`    The value of the core state the submission is in ("Draft", "Submitted", or "Closed")  * `createdBy`    Username that created the submission  * `handle`    A "nearly-unique" identifier for the submission  * `sessionToken`    Used for anonymous submissions  * `submittedBy`    Username that submitted the submission  * `type`    The type of form the submission is associated to  * `updatedBy`    Username that last updated the submission  * `values`    Any field that is implemented by the Form.    Example: the field named 'Approver' would be referred as `values[Approver]`   #### Example Qualifications  ``` (values[Requested By] = "john.doe" OR values[Requested For] = "john.doe")   AND values[Status] IN ("Pending Assignment", "On Hold") ```  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/submissions-search`
**Operation:** `listKappSubmissionsAsPost`
Submissions Search (by Kapp as POST)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Request body (required):** The content for the submissions search


**Success response:** 200

---

### `POST /submissions-multipart/{submissionId}`
**Operation:** `updateSubmissionMultipart`
Submission Update (with Attachments)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `completed` (boolean) | query | No | signals that the submission should be completed (equivalent of submitting all of the pages at once)  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Success response:** 200

---

### `GET /submissions/{submissionId}`
**Operation:** `retrieveSubmission`
Submission Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Success response:** 200

---

### `POST /submissions/{submissionId}`
**Operation:** `submitSubmissionPage`
Submission Submit

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |
| `page` (string) | query | No | The name of the Page being submitted.  |
| `staged` (boolean) | query | No | Indicates whether field validations and page advancement should take place.  |
| `defer` (boolean) | query | No | Indicates the submission is for a subform embedded in a parent submission.  |

**Request body (required):** The content for the submission properties


**Success response:** 200

---

### `PUT /submissions/{submissionId}`
**Operation:** `updateSubmission`
Submission Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Request body (required):** The content for the submission properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `PATCH /submissions/{submissionId}`
**Operation:** `patchExistingSubmission`
Submission Patch (existing)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Request body (required):** The content for the submission properties


**Success response:** 200

---

### `DELETE /submissions/{submissionId}`
**Operation:** `deleteSubmission`
Submission Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Success response:** 200

---

### `GET /submissions/{submissionId}/activities`
**Operation:** `listSubmissionActivities`
Submission Activity List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /submissions/{submissionId}/activities`
**Operation:** `createSubmissionActivity`
Submission Activity Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the submission activity properties


**Success response:** 200

---

### `GET /submissions/{submissionId}/activities/{activityId}`
**Operation:** `retrieveSubmissionActivity`
Submission Activity Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `activityId` (string) | path | Yes | The id of the submission activity  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /submissions/{submissionId}/activities/{activityId}`
**Operation:** `updateSubmissionActivity`
Submission Activity Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `activityId` (string) | path | Yes | The id of the submission activity  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the submission activity properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /submissions/{submissionId}/activities/{activityId}`
**Operation:** `deleteSubmissionActivity`
Submission Activity Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `activityId` (string) | path | Yes | The id of the submission activity  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /submissions/{submissionId}/clone`
**Operation:** `cloneSubmission`
Submission Clone

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `completed` (boolean) | query | No | signals that the submission should be completed (equivalent of submitting all of the pages at once)  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Success response:** 200

---

### `GET /submissions/{submissionId}/files/{fieldName}/{fileIndex}/{fileName}/url`
**Operation:** `retrieveSubmissionFileUrl`
Submission Attachment File URL Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `fieldName` (string) | path | Yes | Name of the field the file attachment was submitted for.  |
| `fileIndex` (integer) | path | Yes | The index in the array of attachments for the field.  This value will always be 0 for File fields that only allow a single value.  |
| `fileName` (string) | path | Yes | Name of the file that was attached to the field.  |

**Success response:** 200

---

### `PUT /submissions/{submissionId}/reindex`
**Operation:** `reindexSubmissions`
Reindex Submissions

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Success response:** 200

---
