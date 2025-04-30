import {
  AccountAndProfileIdsParams,
  AccountIdParam,
  AccountUpdateParams,
  ProfileNameParam,
} from '@ajgifford/keepwatching-common-server/schema';
import { accountService, profileService } from '@ajgifford/keepwatching-common-server/services';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

/**
 * Gets all accounts.
 *
 * @route GET /api/v1/accounts
 */
export const getAccounts = asyncHandler(async (req: Request, res: Response) => {
  try {
    const combinedUsers = await accountService.getAccounts();
    res.json({ message: 'Retrieved accounts', results: combinedUsers });
  } catch (error) {
    throw error;
  }
});

/**
 * Updates an account's details (name and default profile).
 *
 * @route PUT /api/v1/accounts/:accountId
 */
export const editAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.params as AccountIdParam;
    const { name, defaultProfileId }: AccountUpdateParams = req.body;

    const updatedAccount = await accountService.editAccount(Number(accountId), name, Number(defaultProfileId));

    res.status(200).json({
      message: `Updated account ${accountId}`,
      result: updatedAccount,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Deletes an account.
 *
 * @route DELETE /api/v1/accounts/:accountId
 */
export const deleteAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.params as AccountIdParam;

    await accountService.deleteAccount(Number(accountId));
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * Retrieves all profiles for a specific account with show and movie counts.
 *
 * @route GET /api/v1/accounts/:accountId/profiles
 */
export const getProfiles = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.params as AccountIdParam;

    const profiles = await profileService.getProfilesWithCountsByAccount(Number(accountId));
    res.json({ message: 'Retrieved profiles', results: profiles });
  } catch (error) {
    next(error);
  }
});

/**
 * Updates an existing profile's details.
 *
 * @route PUT /api/v1/accounts/:accountId/profiles/:profileId
 */
export const editProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId } = req.params as AccountAndProfileIdsParams;
    const { name }: ProfileNameParam = req.body;

    const updatedProfile = await profileService.updateProfileName(Number(profileId), name);

    res.status(200).json({
      message: 'Profile edited successfully',
      result: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Deletes a profile from an account.
 *
 * This action will cascade delete all watch status data for the profile.
 *
 * @route DELETE /api/v1/accounts/:accountId/profiles/:profileId
 */
export const deleteProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId } = req.params as AccountAndProfileIdsParams;

    await profileService.deleteProfile(Number(profileId));

    res.status(204).json({ message: 'Profile deleted successfully' });
  } catch (error) {
    next(error);
  }
});
