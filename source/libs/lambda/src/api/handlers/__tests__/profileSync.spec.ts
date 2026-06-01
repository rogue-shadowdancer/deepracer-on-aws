// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  AdminListGroupsForUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  type AdminListGroupsForUserCommandInput,
  type UserType,
} from '@aws-sdk/client-cognito-identity-provider';
import { type ProfileItem, profileDao, type ResourceId, TEST_PROFILE_ITEM } from '@deepracer-indy/database';
import { BadRequestError, ProfileSyncOperationStatus, UserGroups } from '@deepracer-indy/typescript-server-client';
import { mockClient } from 'aws-sdk-client-mock';

import { globalSettingsHelper } from '../../../utils/GlobalSettingsHelper.js';
import { TEST_OPERATION_CONTEXT } from '../../constants/testConstants.js';
import { PreviewProfileSyncOperation } from '../previewProfileSync.js';
import { SyncProfilesOperation } from '../syncProfiles.js';

const cognitoMock = mockClient(CognitoIdentityProviderClient);

describe('ProfileSync', () => {
  const userPoolId = 'us-east-1_testpool';

  beforeEach(() => {
    cognitoMock.reset();
    process.env.USER_POOL_ID = userPoolId;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.USER_POOL_ID;
  });

  it('previews unchanged Cognito and Profile users', async () => {
    mockCognitoUsers([
      {
        Username: 'profile-1',
        Attributes: [{ Name: 'email', Value: 'student@example.com' }],
      },
    ]);
    mockGroups({
      [TEST_OPERATION_CONTEXT.profileId]: [UserGroups.ADMIN],
      'profile-1': [UserGroups.RACERS],
    });
    mockProfiles([
      {
        ...TEST_PROFILE_ITEM,
        profileId: 'profile-1' as ResourceId,
        emailAddress: 'student@example.com',
        roleName: UserGroups.RACERS,
      },
    ]);

    const result = await PreviewProfileSyncOperation({}, TEST_OPERATION_CONTEXT);

    expect(result.summary).toEqual({
      total: 1,
      unchanged: 1,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    });
    expect(result.results[0]).toMatchObject({
      profileId: 'profile-1',
      status: ProfileSyncOperationStatus.UNCHANGED,
    });
  });

  it('previews missing profiles, mismatches, skipped users, and orphan profiles', async () => {
    mockCognitoUsers([
      {
        Username: 'missing-profile',
        Attributes: [{ Name: 'email', Value: 'missing@example.com' }],
      },
      {
        Username: 'email-mismatch',
        Attributes: [{ Name: 'email', Value: 'new@example.com' }],
      },
      {
        Username: 'role-mismatch',
        Attributes: [{ Name: 'email', Value: 'role@example.com' }],
      },
      {
        Username: 'no-email',
        Attributes: [],
      },
      {
        Username: 'no-role',
        Attributes: [{ Name: 'email', Value: 'norole@example.com' }],
      },
    ]);
    mockGroups({
      [TEST_OPERATION_CONTEXT.profileId]: [UserGroups.ADMIN],
      'missing-profile': [UserGroups.RACERS],
      'email-mismatch': [UserGroups.RACERS],
      'role-mismatch': [UserGroups.ADMIN],
      'no-email': [UserGroups.RACERS],
      'no-role': [],
    });
    mockProfiles([
      {
        ...TEST_PROFILE_ITEM,
        profileId: 'email-mismatch' as ResourceId,
        emailAddress: 'old@example.com',
        roleName: UserGroups.RACERS,
      },
      {
        ...TEST_PROFILE_ITEM,
        profileId: 'role-mismatch' as ResourceId,
        emailAddress: 'role@example.com',
        roleName: UserGroups.RACERS,
      },
      {
        ...TEST_PROFILE_ITEM,
        profileId: 'orphan-profile' as ResourceId,
        emailAddress: 'orphan@example.com',
        roleName: UserGroups.RACERS,
      },
    ]);

    const result = await PreviewProfileSyncOperation({}, TEST_OPERATION_CONTEXT);

    expect(result.summary).toEqual({
      total: 6,
      unchanged: 0,
      created: 1,
      updated: 2,
      skipped: 3,
      failed: 0,
    });
    expect(result.results.map((row) => row.status)).toEqual([
      ProfileSyncOperationStatus.CREATED,
      ProfileSyncOperationStatus.UPDATED,
      ProfileSyncOperationStatus.UPDATED,
      ProfileSyncOperationStatus.SKIPPED,
      ProfileSyncOperationStatus.SKIPPED,
      ProfileSyncOperationStatus.SKIPPED,
    ]);
    expect(result.results[4].message).toBe('Cognito user is not in a DeepRacer role group.');
    expect(result.results[5].message).toBe('Profile has no matching Cognito user; no changes applied.');
  });

  it('applies profile creation and updates with row-level failures', async () => {
    mockCognitoUsers([
      {
        Username: 'missing-profile',
        Attributes: [
          { Name: 'email', Value: 'missing@example.com' },
          { Name: 'custom:racerAlias', Value: 'missing01' },
        ],
      },
      {
        Username: 'update-profile',
        Attributes: [{ Name: 'email', Value: 'new@example.com' }],
      },
    ]);
    mockGroups({
      [TEST_OPERATION_CONTEXT.profileId]: [UserGroups.ADMIN],
      'missing-profile': [UserGroups.RACERS],
      'update-profile': [UserGroups.RACE_FACILITATORS],
    });
    mockProfiles([
      {
        ...TEST_PROFILE_ITEM,
        profileId: 'update-profile' as ResourceId,
        emailAddress: 'old@example.com',
        roleName: UserGroups.RACERS,
      },
    ]);
    vi.spyOn(globalSettingsHelper, 'getGlobalSetting').mockResolvedValue({
      newUserComputeMinutesLimit: 600,
      newUserModelCountLimit: 10,
    });
    vi.spyOn(profileDao, 'create').mockResolvedValue({
      ...TEST_PROFILE_ITEM,
      profileId: 'missing-profile' as ResourceId,
    });
    vi.spyOn(profileDao, 'update').mockRejectedValue(new Error('DynamoDB update failed'));

    const result = await SyncProfilesOperation({}, TEST_OPERATION_CONTEXT);

    expect(result.summary).toEqual({
      total: 2,
      unchanged: 0,
      created: 1,
      updated: 0,
      skipped: 0,
      failed: 1,
    });
    expect(profileDao.create).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'missing-profile',
        alias: 'missing01',
        emailAddress: 'missing@example.com',
        roleName: UserGroups.RACERS,
        maxTotalComputeMinutes: 600,
        maxModelCount: 10,
      }),
    );
    expect(profileDao.update).toHaveBeenCalledWith(
      { profileId: 'update-profile' },
      { emailAddress: 'new@example.com', roleName: UserGroups.RACE_FACILITATORS },
    );
    expect(result.results.map((row) => row.status)).toEqual([
      ProfileSyncOperationStatus.CREATED,
      ProfileSyncOperationStatus.FAILED,
    ]);
  });

  it('handles Cognito pagination and applies role priority Admin over Facilitator over Racer', async () => {
    cognitoMock
      .on(ListUsersCommand)
      .resolvesOnce({
        Users: [
          {
            Username: 'profile-1',
            Attributes: [{ Name: 'email', Value: 'one@example.com' }],
          },
        ],
        PaginationToken: 'next-page',
      })
      .resolvesOnce({
        Users: [
          {
            Username: 'profile-2',
            Attributes: [{ Name: 'email', Value: 'two@example.com' }],
          },
        ],
      });
    mockGroups({
      [TEST_OPERATION_CONTEXT.profileId]: [UserGroups.ADMIN],
      'profile-1': [UserGroups.RACERS],
      'profile-2': [UserGroups.RACERS, UserGroups.RACE_FACILITATORS, UserGroups.ADMIN],
    });
    mockProfiles([
      {
        ...TEST_PROFILE_ITEM,
        profileId: 'profile-1' as ResourceId,
        emailAddress: 'one@example.com',
        roleName: UserGroups.RACERS,
      },
      {
        ...TEST_PROFILE_ITEM,
        profileId: 'profile-2' as ResourceId,
        emailAddress: 'two@example.com',
        roleName: UserGroups.RACERS,
      },
    ]);

    const result = await PreviewProfileSyncOperation({}, TEST_OPERATION_CONTEXT);

    expect(cognitoMock.commandCalls(ListUsersCommand)).toHaveLength(2);
    expect(result.summary.updated).toBe(1);
    expect(result.results[1]).toMatchObject({
      profileId: 'profile-2',
      status: ProfileSyncOperationStatus.UPDATED,
      message: 'Profile will be updated: role.',
    });
  });

  it('rejects non-admin callers', async () => {
    mockGroups({
      [TEST_OPERATION_CONTEXT.profileId]: [UserGroups.RACERS],
    });

    await expect(PreviewProfileSyncOperation({}, TEST_OPERATION_CONTEXT)).rejects.toBeInstanceOf(BadRequestError);
  });
});

function mockCognitoUsers(users: UserType[]) {
  cognitoMock.on(ListUsersCommand).resolves({ Users: users });
}

function mockProfiles(profiles: ProfileItem[]) {
  vi.spyOn(profileDao, 'list').mockResolvedValue({ data: profiles, cursor: null });
}

function mockGroups(groupsByUsername: Record<string, UserGroups[]>) {
  cognitoMock.on(AdminListGroupsForUserCommand).callsFake((input: AdminListGroupsForUserCommandInput) => ({
    Groups: (groupsByUsername[input.Username ?? ''] ?? []).map((GroupName) => ({ GroupName })),
  }));
}
