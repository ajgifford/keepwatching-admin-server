import {
  AccountAndProfileIdsParams,
  AccountIdParam,
  AccountUIDParams,
  ProfileNameBody,
  UpdateAccountBody,
} from '@ajgifford/keepwatching-common-server/schema';
import {
  accountService,
  adminMovieService,
  adminShowService,
  preferencesService,
  profileService,
  statisticsService,
} from '@ajgifford/keepwatching-common-server/services';
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

export const getAccountStatistics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const accountStatistics = await statisticsService.getAccountStatistics(accountId);
    res.json({ message: 'Retrieved account statistics', results: accountStatistics });
  } catch (error) {
    next(error);
  }
});

export const getProfileStatistics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const profileStatistics = await statisticsService.getProfileStatistics(profileId);
    res.json({ message: 'Retrieved profile statistics', results: profileStatistics });
  } catch (error) {
    next(error);
  }
});

export const getProfileShowsList = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const allShowsResult = await adminShowService.getAllShowsByProfile(profileId, page, offset, limit);

    res.status(200).json({
      message: `Retrieved page ${page} of shows for profile ${profileId}`,
      pagination: allShowsResult.pagination,
      results: allShowsResult.shows,
    });
  } catch (error) {
    next(error);
  }
});

export const getProfileMoviesList = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const allMovieResult = await adminMovieService.getAllMoviesByProfile(profileId, page, offset, limit);

    res.status(200).json({
      message: `Retrieved page ${page} of movies for profile ${profileId}`,
      pagination: allMovieResult.pagination,
      results: allMovieResult.movies,
    });
  } catch (error) {
    next(error);
  }
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountUid } = req.params as unknown as AccountUIDParams;

    await accountService.verifyEmail(accountUid);

    res.status(200).json({
      message: `Email verified for account`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Retrieves all preferences for a specific account.
 *
 * @route GET /api/v1/accounts/:accountId/preferences
 */
export const getAccountPreferences = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;

    const preferences = await preferencesService.getAccountPreferences(accountId);
    res.json({ message: 'Retrieved account preferences', preferences });
  } catch (error) {
    next(error);
  }
});
