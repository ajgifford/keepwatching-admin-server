import {
  AccountAndProfileIdsParams,
  AccountIdParam,
  ProfileNameBody,
  UpdateAccountBody,
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
    res.json({ message: `Retrieved ${combinedUsers.length} accounts`, results: combinedUsers });
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
    const { accountId } = req.params as unknown as AccountIdParam;
    const { name, defaultProfileId }: UpdateAccountBody = req.body;

    const editedAccount = await accountService.editAccount(accountId, name, defaultProfileId);
    if (editedAccount) {
      const updatedAccount = await accountService.getCombinedAccountByEmail(editedAccount.email);
      res.status(200).json({ message: `Updated account ${accountId}`, result: updatedAccount });
      return;
    }

    res.status(200).json({
      message: `No updates made to account ${accountId}`,
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
    const { accountId } = req.params as unknown as AccountIdParam;

    await accountService.deleteAccount(accountId);
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
    const { accountId } = req.params as unknown as AccountIdParam;

    const profiles = await profileService.getAdminProfilesByAccount(accountId);
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
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const { name }: ProfileNameBody = req.body;

    const updatedProfile = await profileService.updateProfileName(profileId, name);

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
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;

    await profileService.deleteProfile(profileId);

    res.status(204).json({ message: 'Profile deleted successfully' });
  } catch (error) {
    next(error);
  }
});
