import { getAdminServiceName, getServiceName } from '@ajgifford/keepwatching-common-server/config';
import { getFirebaseAdmin } from '@ajgifford/keepwatching-common-server/utils';
import { NextFunction, Request, Response } from 'express';

export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header missing or malformed' });
      return;
    }

    const idToken = authHeader.split(' ')[1];
    const firebaseApp = getFirebaseAdmin(getAdminServiceName() ?? getServiceName());

    if (!firebaseApp) {
      res.status(500).json({ error: 'Authentication service unavailable' });
      return;
    }

    const decodedToken = await firebaseApp.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
