import pool from '../utils/db';
import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import admin from 'firebase-admin';
import { UserRecord } from 'firebase-admin/lib/auth/user-record';

const serviceAccount: object = require('../../certs/keepwatching-service-account-dev.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

interface DatabaseAccount {
  account_id: number;
  account_name: string;
  email: string;
  image: string | null;
  default_profile_id: number | null;
  uid: string;
  created_at: Date;
}

interface CombinedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  metadata: {
    creationTime: string;
    lastSignInTime: string;
    lastRefreshTime: string | null;
  };
  account_id: number;
  account_name: string;
  default_profile_id: number | null;
  database_image: string | null;
  database_created_at: Date;
}

async function combineUserData(
  firebaseUsers: UserRecord[],
  databaseAccounts: DatabaseAccount[],
): Promise<CombinedUser[]> {
  const accountMap = new Map(databaseAccounts.map((account) => [account.uid, account]));
  const combinedUsers = firebaseUsers
    .filter((firebaseUser) => accountMap.has(firebaseUser.uid))
    .map((firebaseUser) => {
      const dbAccount = accountMap.get(firebaseUser.uid)!;

      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        emailVerified: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName || null,
        photoURL: firebaseUser.photoURL || null,
        disabled: firebaseUser.disabled,
        metadata: {
          creationTime: firebaseUser.metadata.creationTime,
          lastSignInTime: firebaseUser.metadata.lastSignInTime,
          lastRefreshTime: firebaseUser.metadata.lastRefreshTime || null,
        },
        account_id: dbAccount.account_id,
        account_name: dbAccount.account_name,
        default_profile_id: dbAccount.default_profile_id,
        database_image: dbAccount.image,
        database_created_at: dbAccount.created_at,
      };
    });

  return combinedUsers;
}

// GET /api/v1/accounts
export const getAccounts = asyncHandler(async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    const query = 'SELECT * from accounts';
    const [accounts] = (await pool.execute(query)) as [DatabaseAccount[], any];
    const combinedUsers = await combineUserData(users, accounts);
    res.json({ message: 'Retrieved accounts', results: combinedUsers });
  } catch (error) {
    throw error;
  }
});

async function getAllUsers(): Promise<any[]> {
  let nextPageToken: string | undefined;
  let allUsers: UserRecord[] = [];

  try {
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      allUsers = allUsers.concat(listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    return allUsers;
  } catch (error) {
    throw error;
  }
}

// PUT /api/v1/accounts/:accountId
export const editAccount = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const { accountName } = req.body;

    const query = 'UPDATE accounts SET account_name = ? WHERE account_id = ?';
    const [result] = await pool.execute(query, [accountName, accountId]);
    if ((result as any).affectedRows === 0) {
      res.status(204).json({ message: 'No account update made' });
    } else {
      res.status(200).json({ message: 'Account updated successfully' });
    }
  } catch (error) {
    throw error;
  }
});

// DELETE /api/accounts/:accountId
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const { accountId } = req.params;

    // Get the Firebase UID before deleting the account
    const [rows] = await connection.execute('SELECT uid FROM accounts WHERE account_id = ?', [accountId]);

    // if (!rows[0]) {
    //   return res.status(404).json({ error: 'Account not found' });
    // }

    // const { uid } = rows[0];
    const uid = '';

    await connection.beginTransaction();

    // Delete from database
    await connection.execute('DELETE FROM accounts WHERE account_id = ?', [accountId]);

    // Delete from Firebase
    try {
      await admin.auth().deleteUser(uid);
    } catch (firebaseError) {
      console.error('Error deleting Firebase user:', firebaseError);
      // Continue with the transaction even if Firebase deletion fails
      // The user might already be deleted from Firebase
    }

    await connection.commit();
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  } finally {
    connection.release();
  }
});

// GET /api/v1/accounts/:accountId/profiles
export const getProfiles = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    const query =
      'SELECT p.*, (SELECT COUNT(*) FROM show_watch_status f WHERE f.profile_id = p.profile_id) as favorited_shows, (SELECT COUNT(*) FROM movie_watch_status f WHERE f.profile_id = p.profile_id) as favorited_movies FROM profiles p WHERE p.account_id = ?';
    const [profiles] = await pool.execute(query, [accountId]);
    res.json({ message: 'Retrieved profiles', results: profiles });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// PUT /api/v1/accounts/:accountId/profiles/:profileId
export const editProfile = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const { name } = req.body;

    await pool.execute('UPDATE profiles SET name = ? WHERE profile_id = ?', [name, profileId]);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE /api/v1/accounts/:accountId/profiles/:profileId
export const deleteProfile = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;

    await pool.execute('DELETE FROM profiles WHERE profile_id = ?', [profileId]);

    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});
