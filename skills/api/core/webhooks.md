<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Webhooks API Reference

Source: Kinetic Core REST API v6.1

### `GET /kapps/{kappSlug}/webhooks`
**Operation:** `listKappWebhooks`
Kapp Webhook List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/webhooks`
**Operation:** `createKappWebhook`
Kapp Webhook Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the webhook properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/webhooks/{name}`
**Operation:** `retrieveKappWebhook`
Kapp Webhook Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the webhook  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/webhooks/{name}`
**Operation:** `updateKappWebhook`
Kapp Webhook Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the webhook  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the webhook properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/webhooks/{name}`
**Operation:** `deleteKappWebhook`
Kapp Webhook Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the webhook  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `GET /meta/webhooks/events/kapp`
**Operation:** `kappWebhookEvents`
Kapp Webhook Event List

**Success response:** 200

---

### `GET /meta/webhooks/events/kapp/{type}`
**Operation:** `kappWebhookEventsByType`
Kapp Webhook Event List by Type

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `type` (string) | path | Yes | The type of kapp webhook events to retrieve.  |

**Success response:** 200

---

### `GET /meta/webhooks/events/space`
**Operation:** `spaceWebhookEvents`
Space Webhook Event List

**Success response:** 200

---

### `GET /meta/webhooks/events/space/{type}`
**Operation:** `spaceWebhookEventsByType`
Space Webhook Event List by Type

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `type` (string) | path | Yes | The type of space webhook events to retrieve.  |

**Success response:** 200

---

### `GET /meta/webhooks/types/kapp`
**Operation:** `kappWebhookTypes`
Kapp Webhook Type List

**Success response:** 200

---

### `GET /meta/webhooks/types/space`
**Operation:** `spaceWebhookTypes`
Space Webhook Type List

**Success response:** 200

---

### `GET /webhooks`
**Operation:** `listSpaceWebhooks`
Space Webhook List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /webhooks`
**Operation:** `createSpaceWebhook`
Space Webhook Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the webhook properties


**Success response:** 200

---

### `GET /webhooks/{name}`
**Operation:** `retrieveSpaceWebhook`
Space Webhook Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the webhook  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /webhooks/{name}`
**Operation:** `updateSpaceWebhook`
Space Webhook Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the webhook  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the webhook properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /webhooks/{name}`
**Operation:** `deleteSpaceWebhook`
Space Webhook Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the webhook  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---
