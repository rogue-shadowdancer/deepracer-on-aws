// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Operation } from '@aws-smithy/server-common';
import {
  getUpdateGroupMembershipHandler,
  UpdateGroupMembershipServerInput,
  UpdateGroupMembershipServerOutput,
} from '@deepracer-indy/typescript-server-client';
import { logger } from '@deepracer-indy/utils';

import type { HandlerContext } from '../types/apiGatewayHandlerContext.js';
import { getApiGatewayHandler } from '../utils/apiGateway.js';
import { instrumentOperation } from '../utils/instrumentation/instrumentOperation.js';
import { getConfiguredUserPoolId, replaceUserGroups } from '../utils/profileManagement.js';

export const UpdateGroupMembershipOperation: Operation<
  UpdateGroupMembershipServerInput,
  UpdateGroupMembershipServerOutput,
  HandlerContext
> = async (input, _context) => {
  const { profileId, targetUserPoolGroup } = input;
  const userPoolId = getConfiguredUserPoolId();

  logger.info(`Updating group membership for user ${profileId} to ${targetUserPoolGroup}`);

  await replaceUserGroups(userPoolId, profileId, targetUserPoolGroup);

  return {} as UpdateGroupMembershipServerOutput;
};

export const lambdaHandler = getApiGatewayHandler(
  getUpdateGroupMembershipHandler(instrumentOperation(UpdateGroupMembershipOperation)),
);
