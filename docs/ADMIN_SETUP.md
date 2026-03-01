# Admin Dashboard – Setup & Credentials

## Role-Based Access

- **user** – Default; can browse, save favorites, leave reviews.
- **admin** – Full admin: stats, list/delete users, restaurants, reviews.
- **owner** – Optional; can be used with `authorize(['admin', 'owner'])` if you need a separate role.

All admin routes require a valid JWT and the **admin** role.

---

## How to Create an Admin User

### Option 1: Signup with role (development)

Send a signup request with `role: "admin"`:

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@bitefinder.test",
    "password": "Admin@123",
    "role": "admin"
  }'
```

Use the returned `accessToken` in the `Authorization` header for admin API calls.

### Option 2: Promote existing user in MongoDB

```javascript
// In mongosh or Compass
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

Then log in again to get a new JWT that includes `role: "admin"`.

---

## Test Admin Credentials (for local check)

Create the admin once using Option 1 above, then use:

| Field    | Value              |
|----------|--------------------|
| **Email**    | `admin@bitefinder.test` |
| **Password** | `Admin@123`             |
| **Role**     | `admin`                  |

**Example – get stats:**

```bash
# 1. Login to get token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bitefinder.test","password":"Admin@123"}' \
  | jq -r '.data.accessToken')

# 2. Call admin stats
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/stats | jq
```

---

## Admin API Endpoints

All require: `Authorization: Bearer <accessToken>` and user role **admin**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard stats (counts, topDistrict, mostReviewedRestaurant) |
| GET | `/api/admin/users` | List users (paginated: `?page=1&limit=20`) |
| GET | `/api/admin/restaurants` | List restaurants (paginated) |
| DELETE | `/api/admin/users/:id` | Delete user (and their favorites/reviews) |
| DELETE | `/api/admin/restaurants/:id` | Delete restaurant (and related favorites/reviews) |
| DELETE | `/api/admin/reviews/:id` | Delete a single review |

---

## Stats Response Shape

`GET /api/admin/stats` returns:

```json
{
  "success": true,
  "message": "Admin stats retrieved",
  "data": {
    "totalUsers": 10,
    "totalRestaurants": 5,
    "totalReviews": 42,
    "totalFavorites": 18,
    "topDistrict": { "name": "Kathmandu", "count": 3 },
    "mostReviewedRestaurant": { "_id": "...", "name": "Restaurant Name", "totalReviews": 12 }
  }
}
```

`topDistrict` or `mostReviewedRestaurant` may be `null` if there is no data.
