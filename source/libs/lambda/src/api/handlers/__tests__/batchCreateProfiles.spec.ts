// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminListGroupsForUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { profileDao, TEST_PROFILE_ITEM } from '@deepracer-indy/database';
import { BatchProfileOperationStatus, UserGroups } from '@deepracer-indy/typescript-server-client';
import { mockClient } from 'aws-sdk-client-mock';

import { TEST_OPERATION_CONTEXT } from '../../constants/testConstants.js';
import { BatchCreateProfilesOperation } from '../batchCreateProfiles.js';

describe('BatchCreateProfiles', () => {
  const cognitoMock = mockClient(CognitoIdentityProviderClient);

  beforeEach(() => {
    cognitoMock.reset();
    process.env.USER_POOL_ID = 'us-east-1_testpool';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.USER_POOL_ID;
  });

  it('creates users and applies optional role and quotas', async () => {
    cognitoMock.on(AdminListGroupsForUserCommand).resolves({ Groups: [{ GroupName: UserGroups.ADMIN }] });
    cognitoMock.on(ListUsersCommand).resolves({ Users: [] });
    cognitoMock.on(AdminCreateUserCommand).resolves({});
    cognitoMock.on(AdminAddUserToGroupCommand).resolves({});
    vi.spyOn(profileDao, 'update').mockResolvedValue(TEST_PROFILE_ITEM);

    const result = await BatchCreateProfilesOperation(
      {
        profiles: [
          {
            rowNumber: 2,
            emailAddress: 'student@example.com',
            alias: 'student01',
            role: UserGroups.RACE_FACILITATORS,
            maxTotalComputeMinutes: 120,
            maxModelCount: 5,
          },
        ],
      },
      TEST_OPERATION_CONTEXT,
    );

    expect(result.summary).toEqual({ total: 1, succeeded: 1, failed: 0 });
    expect(result.results[0].status).toBe(BatchProfileOperationStatus.SUCCEEDED);
    expect(cognitoMock.commandCalls(AdminCreateUserCommand)[0].args[0].input.ClientMetadata).toEqual({
      racerAlias: 'student01',
    });
    expect(cognitoMock.commandCalls(AdminAddUserToGroupCommand)[0].args[0].input.GroupName).toBe(
      UserGroups.RACE_FACILITATORS,
    );
    expect(profileDao.update).toHaveBeenCalledWith(
      { profileId: expect.any(String) },
      { maxTotalComputeMinutes: 120, maxModelCount: 5 },
    );
  });

  it('returns row-level failures for invalid and duplicate rows', async () => {
    cognitoMock.on(AdminListGroupsForUserCommand).resolves({ Groups: [{ GroupName: UserGroups.ADMIN }] });

    const result = await BatchCreateProfilesOperation(
      {
        profiles: [
          { rowNumber: 2, emailAddress: 'duplicate@example.com' },
          { rowNumber: 3, emailAddress: 'duplicate@example.com' },
          { rowNumber: 4, emailAddress: 'not-an-email' },
        ],
      },
      TEST_OPERATION_CONTEXT,
    );

    expect(result.summary).toEqual({ total: 3, succeeded: 0, failed: 3 });
    expect(result.results.map((row) => row.status)).toEqual([
      BatchProfileOperationStatus.FAILED,
      BatchProfileOperationStatus.FAILED,
      BatchProfileOperationStatus.FAILED,
    ]);
    expect(cognitoMock.commandCalls(AdminCreateUserCommand)).toHaveLength(0);
  });
});
