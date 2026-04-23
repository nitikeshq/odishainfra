import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request<Record<string, string>> {
    user?: {
        id: string;
        phone: string | null;
        email: string | null;
        role: string;
        name?: string | null;
    };
}
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireRole: (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.middleware.d.ts.map