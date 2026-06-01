// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Operation } from '@aws-smithy/server-common';
import {
  BadRequestError,
  getPreviewProfileSyncHandler,
  PreviewProfileSyncServerInput,
  PreviewProfileSyncServerOutput,
} from '@deepracer-indy/typescript-server-client';

import type { HandlerContext } from '../types/apiGatewayHandlerContext.js';
import { getApiGatewayHandler, isUserAdmin } from '../utils/apiGateway.js';
import { instrumentOperation } from '../utils/instrumentation/instrumentOperation.js';
import { buildProfileSyncPreview } from '../utils/profileSync.js';

export const PreviewProfileSyncOperation: Operation<
  PreviewProfileSyncServerInput,
  PreviewProfileSyncServerOutput,
  HandlerContext
> = async (_input, context) => {
  if (!(await isUserAdmin(context.profileId))) {
    throw new BadRequestError({ message: 'Only administrators can sync user profiles.' });
  }

  return buildProfileSyncPreview();
};

export const lambdaHandler = getApiGatewayHandler(
  getPreviewProfileSyncHandler(instrumentOperation(PreviewProfileSyncOperation)),
);
