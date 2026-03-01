declare const mongoose: any;
declare const User: any;
declare const Restaurant: any;
declare const Review: any;
declare const Favorite: any;
declare const DEFAULT_PAGE = 1;
declare const DEFAULT_LIMIT = 20;
declare const MAX_LIMIT = 100;
declare const ALLOWED_DISTRICTS: string[];
declare const ALLOWED_USER_ROLES: string[];
declare const normalizeFoodRating: (value: any) => number;
/**
 * GET /api/admin/stats
 * Returns dashboard stats using aggregation. Admin only.
 */
declare const getStats: (req: any, res: any, next: any) => Promise<any>;
/**
 * GET /api/admin/users
 * List users with pagination. Minimal fields, no population. Admin only.
 */
declare const getUsers: (req: any, res: any, next: any) => Promise<any>;
/**
 * GET /api/admin/users/:id
 * Get a single user by id. Admin only.
 */
declare const getUserById: (req: any, res: any, next: any) => Promise<any>;
/**
 * PUT /api/admin/users/:id
 * Update user profile fields. Admin only.
 */
declare const updateUser: (req: any, res: any, next: any) => Promise<any>;
/**
 * GET /api/admin/restaurants
 * List restaurants with pagination. Minimal fields. Admin only.
 */
declare const getRestaurants: (req: any, res: any, next: any) => Promise<any>;
/**
 * DELETE /api/admin/users/:id
 * Delete a user. Admin only. Cascades: favorites, reviews (optional — handle if needed).
 */
declare const deleteUser: (req: any, res: any, next: any) => Promise<any>;
/**
 * DELETE /api/admin/restaurants/:id
 * Delete a restaurant. Admin only. Remove related favorites and reviews.
 */
declare const deleteRestaurant: (req: any, res: any, next: any) => Promise<any>;
/**
 * PUT /api/admin/restaurants/:id
 * Update top-level restaurant fields (e.g., district, name). Admin only.
 */
declare const updateRestaurant: (req: any, res: any, next: any) => Promise<any>;
/**
 * DELETE /api/admin/reviews/:id
 * Delete a review by id. Admin only.
 */
declare const deleteReview: (req: any, res: any, next: any) => Promise<any>;
/**
 * POST /api/admin/restaurants/:restaurantId/foods
 * Add a new embedded food item to a restaurant. Admin only.
 */
declare const addRestaurantFood: (req: any, res: any, next: any) => Promise<any>;
/**
 * PUT /api/admin/restaurants/:restaurantId/foods/:foodId
 * Update an embedded food item using positional operator. Admin only.
 */
declare const updateRestaurantFood: (req: any, res: any, next: any) => Promise<any>;
/**
 * DELETE /api/admin/restaurants/:restaurantId/foods/:foodId
 * Remove embedded food item. Admin only.
 */
declare const deleteRestaurantFood: (req: any, res: any, next: any) => Promise<any>;
/**
 * GET /api/admin/analytics?period=7d|28d|90d
 * Returns time series counts grouped by day for users, restaurants, reviews, favorites
 */
declare const getAnalytics: (req: any, res: any, next: any) => Promise<any>;
//# sourceMappingURL=adminController.d.ts.map