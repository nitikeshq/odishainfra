import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
/**
 * Checks whether the platform requires an active subscription.
 * If `subscriptionEnabled` is true and the requesting developer does not have
 * an ACTIVE subscription with a future end date, returns HTTP 402.
 * Non-developer roles are always allowed through.
 */
export declare const requireSubscription: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=subscription.middleware.d.ts.map