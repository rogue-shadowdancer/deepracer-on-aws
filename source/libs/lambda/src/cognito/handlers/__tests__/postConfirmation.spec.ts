// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import type { PostConfirmationTriggerEvent, Context, Callback } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { describe, it, expect, beforeEach } from 'vitest';

import { PostConfirmation } from '../postConfirmation';

describe('PostConfirmation lambda', () => {
  const cognitoMock = mockClient(CognitoIdentityProviderClient);
  const context = {} as Context;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const callback = (() => {}) as Callback<unknown>;

  beforeEach(() => {
    cognitoMock.reset();
  });

  it('adds a new user to the racers group by default', async () => {
    cognitoMock.on(AdminListGroupsForUserCommand).resolves({ Groups: [] });
    cognitoMock.on(AdminAddUserToGroupCommand).resolves({});

    const event: PostConfirmationTriggerEvent = {
      version: '1',
      region: 'us-east-1',
      userPoolId: 'us-east-1_123456789',
      userName: 'testuser',
      callerContext: {
        awsSdkVersion: 'aws-sdk-unknown-unknown',
        clientId: 'client123',
      },
      triggerSource: 'PostConfirmation_ConfirmSignUp',
      request: {
        userAttributes: {
          sub: 'user123',
          email_verified: 'true',
          'cognito:user_status': 'CONFIRMED',
          email: 'test@example.com',
        },
      },
      response: {},
    };

    const result = await PostConfirmation(event, context, callback);

    // Verify Cognito API call
    expect(cognitoMock.commandCalls(AdminListGroupsForUserCommand)).toHaveLength(1);
    expect(cognitoMock.commandCalls(AdminAddUserToGroupCommand)).toHaveLength(1);
    expect(cognitoMock.commandCalls(AdminAddUserToGroupCommand)[0].args[0].input).toEqual({
      UserPoolId: 'us-east-1_123456789',
      Username: 'testuser',
      GroupName: 'dr-racers',
    });

    // Verify event is returned unchanged
    expect(result).toBe(event);
  });

  it('does not add racer group if user already has a DeepRacer role', async () => {
    cognitoMock.on(AdminListGroupsForUserCommand).resolves({ Groups: [{ GroupName: 'dr-admins' }] });

    const event: PostConfirmationTriggerEvent = {
      version: '1',
      region: 'us-east-1',
      userPoolId: 'us-east-1_123456789',
      userName: 'testuser',
      callerContext: {
        awsSdkVersion: 'aws-sdk-unknown-unknown',
        clientId: 'client123',
      },
      triggerSource: 'PostConfirmation_ConfirmSignUp',
      request: {
        userAttributes: {
          sub: 'user123',
          email_verified: 'true',
          'cognito:user_status': 'CONFIRMED',
          email: 'test@example.com',
        },
      },
      response: {},
    };

    const result = await PostConfirmation(event, context, callback);

    expect(cognitoMock.commandCalls(AdminListGroupsForUserCommand)).toHaveLength(1);
    expect(cognitoMock.commandCalls(AdminAddUserToGroupCommand)).toHaveLength(0);
    expect(result).toBe(event);
  });

  it('throws an error if the call to cognito fails', async () => {
    cognitoMock.on(AdminListGroupsForUserCommand).resolves({ Groups: [] });
    cognitoMock.on(AdminAddUserToGroupCommand).rejects(new Error('Cognito error'));

    const event: PostConfirmationTriggerEvent = {
      version: '1',
      region: 'us-east-1',
      userPoolId: 'us-east-1_123456789',
      userName: 'testuser',
      callerContext: {
        awsSdkVersion: 'aws-sdk-unknown-unknown',
        clientId: 'client123',
      },
      triggerSource: 'PostConfirmation_ConfirmSignUp',
      request: {
        userAttributes: {
          sub: 'user123',
          email_verified: 'true',
          'cognito:user_status': 'CONFIRMED',
          email: 'test@example.com',
        },
      },
      response: {},
    };

    await expect(PostConfirmation(event, context, callback)).rejects.toThrow('Failed to add user to group');
  });
});
