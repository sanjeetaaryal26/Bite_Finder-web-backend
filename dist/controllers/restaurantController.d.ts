declare const Restaurant: any;
declare const Review: any;
declare const DEFAULT_PAGE = 1;
declare const DEFAULT_LIMIT = 10;
declare const MAX_LIMIT = 100;
declare const DEFAULT_NEARBY_DISTANCE_METERS = 5000;
declare const ALLOWED_DISTRICTS: string[];
declare const VALID_GEOJSON_LOCATION_FILTER: {
    'location.type': string;
    'location.coordinates.0': {
        $exists: boolean;
        $type: string;
    };
    'location.coordinates.1': {
        $exists: boolean;
        $type: string;
    };
    'location.coordinates.2': {
        $exists: boolean;
    };
};
declare const escapeRegex: (value?: string) => string;
declare const getRestaurants: (req: any, res: any, next: any) => Promise<any>;
declare const getRestaurantById: (req: any, res: any, next: any) => Promise<any>;
declare const createRestaurant: (req: any, res: any, next: any) => Promise<any>;
declare const searchRestaurants: (req: any, res: any, next: any) => Promise<any>;
declare const getNearbyRestaurants: (req: any, res: any, next: any) => Promise<any>;
declare const filterRestaurants: (req: any, res: any, next: any) => Promise<any>;
declare const getTrendingRestaurants: (req: any, res: any, next: any) => Promise<any>;
declare const getMostReviewedRestaurants: (req: any, res: any, next: any) => Promise<any>;
declare const getMostSavedRestaurants: (req: any, res: any, next: any) => Promise<any>;
declare const getTopFoodByDistrict: (req: any, res: any, next: any) => Promise<any>;
declare const getRestaurantReviews: (req: any, res: any, next: any) => Promise<any>;
//# sourceMappingURL=restaurantController.d.ts.map