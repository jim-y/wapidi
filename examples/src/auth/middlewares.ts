import { Request, Response, NextFunction } from 'express';

export const EnsureAuthenticated = () => (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.get('Authorization');

    if (!authHeader) {
        res.sendStatus(401);
        return;
    }

    const [scheme, token] = authHeader.split(' ');

    if (!scheme || scheme.toLowerCase() !== 'bearer') {
        res.sendStatus(401);
        return;
    }

    // @ts-ignore
    req.state = { token };
    next();
};
