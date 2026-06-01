// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { generateResourceId, ResourceId } from '@deepracer-indy/database';
import { BadRequestError, InternalFailureError, UserGroups } from '@deepracer-indy/typescript-server-client';
import { logger } from '@deepracer-indy/utils';

import { cognitoClient } from '../../utils/clients/cognitoClient.js';

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const DEEPRACER_ROLE_GROUPS = new Set<string>([
  UserGroups.ADMIN,
  UserGroups.RACE_FACILITATORS,
  UserGroups.RACERS,
]);

export function getConfiguredUserPoolId(): string {
  const userPoolId = process.env.USER_POOL_ID;
  if (!userPoolId) {
    throw new InternalFailureError({ message: 'Service configuration error.' });
  }
  return userPoolId;
}

export function validateEmailAddress(emailAddress: string): void {
  if (!EMAIL_REGEX.test(emailAddress)) {
    throw new BadRequestError({ message: 'Invalid email address format.' });
  }
}

export function validateRacerAlias(alias?: string): void {
  if (alias === undefined) {
    return;
  }

  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(alias)) {
    throw new BadRequestError({
      message: 'Alias must be 3-20 characters and use only letters, numbers, underscores, or hyphens.',
    });
  }
}

export function validateQuotaValue(value: number | undefined, fieldName: string): void {
  if (value === undefined) {
    return;
  }

  if (!Number.isInteger(value) || value < -1) {
    throw new BadRequestError({ message: `${fieldName} must be -1 or a non-negative integer.` });
  }
}

export function validateRole(role?: UserGroups): void {
  if (role === undefined) {
    return;
  }

  if (!DEEPRACER_ROLE_GROUPS.has(role)) {
    throw new BadRequestError({ message: 'Invalid role.' });
  }
}

export async function checkUserExists(userPoolId: string, emailAddress: string): Promise<boolean> {
  logger.info(`Checking if user exists with email: ${emailAddress}`);
  try {
    const response = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Filter: `email = "${emailAddress}"`,
      }),
    );
    return (response.Users?.length ?? 0) > 0;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    throw new InternalFailureError({ message: 'Unable to verify user. Please try again.' });
  }
}

export async function createCognitoUser(userPoolId: string, username: string, emailAddress: string, alias?: string) {
  logger.info(`Creating user with username: ${username} emailAddress: ${emailAddress} userPoolId: ${userPoolId}`);
  try {
    await cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: username,
        DesiredDeliveryMediums: ['EMAIL'],
        UserAttributes: [
          {
            Name: 'email',
            Value: emailAddress,
          },
          {
            Name: 'email_verified',
            Value: 'true',
          },
        ],
        ...(alias && { ClientMetadata: { racerAlias: alias } }),
      }),
    );
  } catch (error) {
    if (error instanceof Error) {
      logger.error(JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    throw new InternalFailureError({ message: 'Unable to create profile. Please try again.' });
  }
}

export async function addUserToGroup(userPoolId: string, username: string, groupName: UserGroups) {
  logger.info(`Adding user to group: ${groupName} userPoolId: ${userPoolId} username: ${username}`);
  await cognitoClient.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: username,
      GroupName: groupName,
    }),
  );
}

export async function deleteCognitoUser(userPoolId: string, username: string) {
  logger.info(`Deleting user with username: ${username} userPoolId: ${userPoolId}`);
  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: username,
      }),
    );
  } catch (error) {
    if (error instanceof Error) {
      logger.error(JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    throw new InternalFailureError({ message: 'Unable to delete user. Please try again.' });
  }
}

export async function createProfileUser({
  emailAddress,
  alias,
  role = UserGroups.RACERS,
}: {
  emailAddress: string;
  alias?: string;
  role?: UserGroups;
}): Promise<ResourceId> {
  const userPoolId = getConfiguredUserPoolId();

  validateEmailAddress(emailAddress);
  validateRacerAlias(alias);
  validateRole(role);

  const userExists = await checkUserExists(userPoolId, emailAddress);
  if (userExists) {
    throw new BadRequestError({ message: 'A user with this email address already exists.' });
  }

  const username = generateResourceId();
  await createCognitoUser(userPoolId, username, emailAddress, alias);

  try {
    await addUserToGroup(userPoolId, username, role);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(JSON.stringify(error, Object.getOwnPropertyNames(error)));
      await deleteCognitoUser(userPoolId, username);
      throw new InternalFailureError({ message: 'Unable to add user to Group. Please try again.' });
    }
  }

  return username;
}

export async function replaceUserGroups(userPoolId: string, profileId: string, targetUserPoolGroup: UserGroups) {
  validateRole(targetUserPoolGroup);

  const originalGroups = await removeUserFromExistingGroups(userPoolId, profileId);

  try {
    await addUserToGroup(userPoolId, profileId, targetUserPoolGroup);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(JSON.stringify(error, Object.getOwnPropertyNames(error)));
      await restoreOriginalGroups(originalGroups, userPoolId, profileId);
    }
    throw new InternalFailureError({ message: 'Failed to add user to new group.' });
  }
}

async function restoreOriginalGroups(originalGroups: string[], userPoolId: string, profileId: string) {
  const failedGroups: string[] = [];

  for (const groupName of originalGroups) {
    try {
      await addUserToGroup(userPoolId, profileId, groupName as UserGroups);
    } catch {
      failedGroups.push(groupName);
      logger.error(`Failed to restore group ${groupName}`);
    }
  }

  if (failedGroups.length > 0) {
    throw new InternalFailureError({ message: 'Failed to restore membership in one or more groups.' });
  }
}

async function removeUserFromExistingGroups(userPoolId: string, profileId: string) {
  try {
    const listGroupsResponse = await cognitoClient.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: userPoolId,
        Username: profileId,
      }),
    );
    logger.info(`Current group memberships: ${JSON.stringify(listGroupsResponse)}`);

    const originalGroups = listGroupsResponse.Groups?.map((group) => group.GroupName).filter(Boolean) as
      | string[]
      | undefined;

    for (const groupName of originalGroups ?? []) {
      await cognitoClient.send(
        new AdminRemoveUserFromGroupCommand({
          UserPoolId: userPoolId,
          Username: profileId,
          GroupName: groupName,
        }),
      );
    }

    logger.info(`Removed user ${profileId} from all groups`);
    return originalGroups ?? [];
  } catch (error) {
    if (error instanceof Error) {
      logger.error(JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    throw new InternalFailureError({ message: 'Failed to remove user from groups.' });
  }
}
