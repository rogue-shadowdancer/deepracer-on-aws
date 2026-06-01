// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { profileDao, TEST_PROFILE_ID_2, TEST_PROFILE_ITEM } from '@deepracer-indy/database';
import { BatchProfileOperationStatus, UserGroups } from '@deepracer-indy/typescript-server-client';
import { mockClient } from 'aws-sdk-client-mock';

import { TEST_OPERATION_CONTEXT } from '../../constants/testConstants.js';
import { BatchUpdateProfilesOperation } from '../batchUpdateProfiles.js';

describe('BatchUpdateProfiles', () => {
  const cognitoMock = mockClient(CognitoIdentityProviderClient);

  beforeEach(() => {
    cognitoMock.reset();
    process.env.USER_POOL_ID = 'us-east-1_testpool';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.USER_POOL_ID;
  });

  it('updates roles and quotas for selected users', async () => {
    cognitoMock.on(AdminListGroupsForUserCommand).resolves({ Groups: [{ GroupName: UserGroups.ADMIN }] });
    cognitoMock.on(AdminRemoveUserFromGroupCommand).resolves({});
    cognitoMock.on(AdminAddUserToGroupCommand).resolves({});
    vi.spyOn(profileDao, 'update').mockResolvedValue({ ...TEST_PROFILE_ITEM, profileId: TEST_PROFILE_ID_2 });

    const result = await BatchUpdateProfilesOperation(
      {
        updates: [
          {
            rowNumber: 1,
            profileId: TEST_PROFILE_ID_2,
            role: UserGroups.RACERS,
            maxTotalComputeMinutes: 180,
            maxModelCount: 3,
          },
        ],
      },
      TEST_OPERATION_CONTEXT,
    );

    expect(result.summary).toEqual({ total: 1, succeeded: 1, failed: 0 });
    expect(result.results[0].status).toBe(BatchProfileOperationStatus.SUCCEEDED);
    expect(cognitoMock.commandCalls(AdminAddUserToGroupCommand)[0].args[0].input.GroupName).toBe(UserGroups.RACERS);
    expect(profileDao.update).toHaveBeenCalledWith(
      { profileId: TEST_PROFILE_ID_2 },
      { maxTotalComputeMinutes: 180, maxModelCount: 3 },
    );
  });

  it('rejects protected role changes row by row', async () => {
    cognitoMock.on(AdminListGroupsForUserCommand).resolves({ Groups: [{ GroupName: UserGroups.ADMIN }] });
    const updateSpy = vi.spyOn(profileDao, 'update');

    const result = await BatchUpdateProfilesOperation(
      {
        updates: [
          {
            rowNumber: 1,
            profileId: TEST_OPERATION_CONTEXT.profileId,
            role: UserGroups.RACERS,
          },
          {
            rowNumber: 2,
            profileId: 'admin1234567890',
            role: UserGroups.RACERS,
          },
        ],
      },
      TEST_OPERATION_CONTEXT,
    );

    expect(result.summary).toEqual({ total: 2, succeeded: 0, failed: 2 });
    expect(result.results.map((row) => row.status)).toEqual([
      BatchProfileOperationStatus.FAILED,
      BatchProfileOperationStatus.FAILED,
    ]);
    expect(cognitoMock.commandCalls(AdminAddUserToGroupCommand)).toHaveLength(0);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('returns row-level failure for duplicate profile ids', async () => {
    cognitoMock.on(AdminListGroupsForUserCommand).resolves({ Groups: [{ GroupName: UserGroups.ADMIN }] });

    const result = await BatchUpdateProfilesOperation(
      {
        updates: [
          { rowNumber: 1, profileId: TEST_PROFILE_ID_2, maxModelCount: 3 },
          { rowNumber: 2, profileId: TEST_PROFILE_ID_2, maxModelCount: 4 },
        ],
      },
      TEST_OPERATION_CONTEXT,
    );

    expect(result.summary).toEqual({ total: 2, succeeded: 0, failed: 2 });
    expect(result.results.every((row) => row.message === 'Duplicate profileId in batch.')).toBe(true);
  });
});
