// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Operation } from '@aws-smithy/server-common';
import {
  CreateProfileServerInput,
  CreateProfileServerOutput,
  getCreateProfileHandler,
} from '@deepracer-indy/typescript-server-client';

import type { HandlerContext } from '../types/apiGatewayHandlerContext.js';
import { getApiGatewayHandler } from '../utils/apiGateway.js';
import { instrumentOperation } from '../utils/instrumentation/instrumentOperation.js';
import { createProfileUser } from '../utils/profileManagement.js';

export const CreateProfileOperation: Operation<
  CreateProfileServerInput,
  CreateProfileServerOutput,
  HandlerContext
> = async (input) => {
  const { emailAddress } = input;

  await createProfileUser({ emailAddress });

  return {
    message: 'Profile created successfully. Check your email for login instructions.',
  };
};

export const lambdaHandler = getApiGatewayHandler(getCreateProfileHandler(instrumentOperation(CreateProfileOperation)));
