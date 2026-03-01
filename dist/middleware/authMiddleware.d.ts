declare const jwt: any;
/**
 * Protect: ensures the request is authenticated (valid JWT).
 * Attaches req.user = { id, role }.
 */
declare const protect: (req: any, res: any, next: any) => any;
/**
 * Authorize: restricts access to given role(s).
 * Use after protect. role can be a string ('admin') or array (['admin', 'owner']).
 */
declare const authorize: (...allowedRoles: any[]) => (req: any, res: any, next: any) => any;
/** @deprecated Use protect instead */
declare const authMiddleware: (req: any, res: any, next: any) => any;
declare const requireAdmin: (req: any, res: any, next: any) => any;
//# sourceMappingURL=authMiddleware.d.ts.map