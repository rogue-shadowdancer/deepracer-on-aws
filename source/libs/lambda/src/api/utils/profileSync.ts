// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  AdminListGroupsForUserCommand,
  ListUsersCommand,
  type AttributeType,
  type UserType,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  DEFAULT_MAX_QUERY_RESULTS,
  DynamoDBItemAttribute,
  profileDao,
  type ProfileItem,
  type ResourceId,
} from '@deepracer-indy/database';
import {
  InternalFailureError,
  ProfileSyncOperationStatus,
  type ProfileSyncOperationSummary,
  type SyncProfilesServerOutput,
  UserGroups,
} from '@deepracer-indy/typescript-server-client';
import { logger } from '@deepracer-indy/utils';

import { DEEPRACER_ROLE_GROUPS, getConfiguredUserPoolId } from './profileManagement.js';
import { cognitoClient } from '../../utils/clients/cognitoClient.js';
import { globalSettingsHelper } from '../../utils/GlobalSettingsHelper.js';

type ProfileSyncResult = SyncProfilesServerOutput['results'][number];
type ProfileSyncOutput = Pick<SyncProfilesServerOutput, 'summary' | 'results'>;

interface NewUserLimits {
  newUserComputeMinutesLimit: number;
  newUserModelCountLimit: number;
}

const rolePriority = [UserGroups.ADMIN, UserGroups.RACE_FACILITATORS, UserGroups.RACERS];
const defaultAlias = 'RacerAlias';

export async function buildProfileSyncPreview(): Promise<ProfileSyncOutput> {
  return buildProfileSync({ apply: false });
}

export async function applyProfileSync(): Promise<ProfileSyncOutput> {
  return buildProfileSync({ apply: true });
}

async function buildProfileSync({ apply }: { apply: boolean }): Promise<ProfileSyncOutput> {
  const userPoolId = getConfiguredUserPoolId();
  const [cognitoUsers, profiles] = await Promise.all([listCognitoUsers(userPoolId), listAllProfiles()]);
  const profilesById = new Map(profiles.map((profile) => [profile.profileId, profile]));
  const cognitoUserIds = new Set(cognitoUsers.map((user) => user.Username).filter(Boolean) as string[]);
  let newUserLimits: NewUserLimits | undefined;
  const results: ProfileSyncResult[] = [];

  for (const user of cognitoUsers) {
    const rowNumber = results.length + 1;
    const profileId = user.Username;

    if (!profileId) {
      results.push({
        rowNumber,
        status: ProfileSyncOperationStatus.SKIPPED,
        message: 'Cognito user has no username.',
      });
      continue;
    }

    const emailAddress = getUserAttribute(user.Attributes, 'email')?.trim();
    if (!emailAddress) {
      results.push({
        rowNumber,
        profileId,
        status: ProfileSyncOperationStatus.SKIPPED,
        message: 'Cognito user has no email address.',
      });
      continue;
    }

    try {
      const roleName = await getDeepRacerRole(userPoolId, profileId);
      if (!roleName) {
        results.push({
          rowNumber,
          profileId,
          emailAddress,
          status: ProfileSyncOperationStatus.SKIPPED,
          message: 'Cognito user is not in a DeepRacer role group.',
        });
        continue;
      }

      const existingProfile = profilesById.get(profileId as ResourceId);
      if (!existingProfile) {
        if (apply && !newUserLimits) {
          newUserLimits = await getNewUserLimits();
        }

        results.push(
          await handleMissingProfile({
            rowNumber,
            user,
            profileId,
            emailAddress,
            roleName,
            newUserLimits,
            apply,
          }),
        );
        continue;
      }

      results.push(
        await handleExistingProfile({
          rowNumber,
          profileId,
          emailAddress,
          roleName,
          existingProfile,
          apply,
        }),
      );
    } catch (error) {
      results.push({
        rowNumber,
        profileId,
        emailAddress,
        status: ProfileSyncOperationStatus.FAILED,
        message: getErrorMessage(error),
      });
    }
  }

  for (const profile of profiles) {
    if (!cognitoUserIds.has(profile.profileId)) {
      results.push({
        rowNumber: results.length + 1,
        profileId: profile.profileId,
        emailAddress: profile.emailAddress,
        status: ProfileSyncOperationStatus.SKIPPED,
        message: 'Profile has no matching Cognito user; no changes applied.',
      });
    }
  }

  return {
    summary: buildSummary(results),
    results,
  };
}

async function listCognitoUsers(userPoolId: string) {
  const users: UserType[] = [];
  let paginationToken: string | undefined;

  do {
    const response = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        PaginationToken: paginationToken,
      }),
    );
    users.push(...(response.Users ?? []));
    paginationToken = response.PaginationToken;
  } while (paginationToken);

  return users;
}

async function listAllProfiles() {
  const profiles: ProfileItem[] = [];
  let cursor: string | null = null;

  do {
    const result = await profileDao.list({ cursor, maxResults: DEFAULT_MAX_QUERY_RESULTS });
    profiles.push(...result.data);
    cursor = result.cursor;
  } while (cursor);

  return profiles;
}

async function getDeepRacerRole(userPoolId: string, profileId: string) {
  const response = await cognitoClient.send(
    new AdminListGroupsForUserCommand({
      UserPoolId: userPoolId,
      Username: profileId,
    }),
  );
  const groups = new Set(response.Groups?.map((group) => group.GroupName).filter(Boolean) as string[]);
  return rolePriority.find((role) => groups.has(role) && DEEPRACER_ROLE_GROUPS.has(role));
}

async function handleMissingProfile({
  rowNumber,
  user,
  profileId,
  emailAddress,
  roleName,
  newUserLimits,
  apply,
}: {
  rowNumber: number;
  user: UserType;
  profileId: string;
  emailAddress: string;
  roleName: UserGroups;
  newUserLimits?: NewUserLimits;
  apply: boolean;
}): Promise<ProfileSyncResult> {
  if (!apply) {
    return {
      rowNumber,
      profileId,
      emailAddress,
      status: ProfileSyncOperationStatus.CREATED,
      message: 'Profile will be created.',
    };
  }

  if (!newUserLimits) {
    throw new InternalFailureError({ message: 'Service configuration error.' });
  }

  await profileDao.create({
    profileId: profileId as ResourceId,
    alias: getAlias(user.Attributes),
    [DynamoDBItemAttribute.EMAIL_ADDRESS]: emailAddress,
    [DynamoDBItemAttribute.ROLE_NAME]: roleName,
    [DynamoDBItemAttribute.MAX_TOTAL_COMPUTE_MINUTES]: Number(newUserLimits.newUserComputeMinutesLimit),
    [DynamoDBItemAttribute.MAX_MODEL_COUNT]: Number(newUserLimits.newUserModelCountLimit),
    [DynamoDBItemAttribute.CREATED_AT]: new Date().toISOString(),
  });

  return {
    rowNumber,
    profileId,
    emailAddress,
    status: ProfileSyncOperationStatus.CREATED,
    message: 'Profile created.',
  };
}

async function handleExistingProfile({
  rowNumber,
  profileId,
  emailAddress,
  roleName,
  existingProfile,
  apply,
}: {
  rowNumber: number;
  profileId: string;
  emailAddress: string;
  roleName: UserGroups;
  existingProfile: ProfileItem;
  apply: boolean;
}): Promise<ProfileSyncResult> {
  const updates = {
    ...(existingProfile.emailAddress !== emailAddress && {
      [DynamoDBItemAttribute.EMAIL_ADDRESS]: emailAddress,
    }),
    ...(existingProfile.roleName !== roleName && {
      [DynamoDBItemAttribute.ROLE_NAME]: roleName,
    }),
  };
  const updatedFields = Object.keys(updates);

  if (updatedFields.length === 0) {
    return {
      rowNumber,
      profileId,
      emailAddress,
      status: ProfileSyncOperationStatus.UNCHANGED,
      message: 'Profile is already in sync.',
    };
  }

  if (apply) {
    await profileDao.update({ profileId: profileId as ResourceId }, updates);
  }

  return {
    rowNumber,
    profileId,
    emailAddress,
    status: ProfileSyncOperationStatus.UPDATED,
    message: `Profile ${apply ? 'updated' : 'will be updated'}: ${formatUpdatedFields(updatedFields)}.`,
  };
}

function getUserAttribute(attributes: AttributeType[] | undefined, name: string) {
  return attributes?.find((attribute) => attribute.Name === name)?.Value;
}

function getAlias(attributes: AttributeType[] | undefined) {
  const alias = getUserAttribute(attributes, 'custom:racerAlias') ?? getUserAttribute(attributes, 'name');
  if (alias && /^[a-zA-Z0-9_-]{3,20}$/.test(alias)) {
    return alias;
  }
  return defaultAlias;
}

async function getNewUserLimits(): Promise<NewUserLimits> {
  const newUserLimits = (await globalSettingsHelper.getGlobalSetting('usageQuotas.newUser')) as Partial<NewUserLimits>;
  const computeMinutesLimit = Number(newUserLimits.newUserComputeMinutesLimit);
  const modelCountLimit = Number(newUserLimits.newUserModelCountLimit);

  if (!Number.isFinite(computeMinutesLimit) || !Number.isFinite(modelCountLimit)) {
    logger.error('Failed to sync profile; invalid usageQuotas.newUser setting from AppConfig');
    throw new InternalFailureError({ message: 'Service configuration error.' });
  }

  return {
    newUserComputeMinutesLimit: computeMinutesLimit,
    newUserModelCountLimit: modelCountLimit,
  };
}

function formatUpdatedFields(fields: string[]) {
  return fields.map((field) => (field === DynamoDBItemAttribute.EMAIL_ADDRESS ? 'email address' : 'role')).join(', ');
}

function buildSummary(results: ProfileSyncResult[]): ProfileSyncOperationSummary {
  return {
    total: results.length,
    unchanged: countStatus(results, ProfileSyncOperationStatus.UNCHANGED),
    created: countStatus(results, ProfileSyncOperationStatus.CREATED),
    updated: countStatus(results, ProfileSyncOperationStatus.UPDATED),
    skipped: countStatus(results, ProfileSyncOperationStatus.SKIPPED),
    failed: countStatus(results, ProfileSyncOperationStatus.FAILED),
  };
}

function countStatus(results: ProfileSyncResult[], status: ProfileSyncOperationStatus) {
  return results.filter((result) => result.status === status).length;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unknown error occurred.';
}
