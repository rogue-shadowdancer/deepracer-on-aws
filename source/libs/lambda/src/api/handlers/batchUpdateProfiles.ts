// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Operation } from '@aws-smithy/server-common';
import { profileDao, ResourceId } from '@deepracer-indy/database';
import {
  BadRequestError,
  BatchProfileOperationStatus,
  BatchUpdateProfilesServerInput,
  BatchUpdateProfilesServerOutput,
  getBatchUpdateProfilesHandler,
} from '@deepracer-indy/typescript-server-client';

import type { HandlerContext } from '../types/apiGatewayHandlerContext.js';
import { getApiGatewayHandler, isUserAdmin } from '../utils/apiGateway.js';
import { instrumentOperation } from '../utils/instrumentation/instrumentOperation.js';
import {
  getConfiguredUserPoolId,
  replaceUserGroups,
  validateQuotaValue,
  validateRole,
} from '../utils/profileManagement.js';

type BatchResult = BatchUpdateProfilesServerOutput['results'][number];

export const BatchUpdateProfilesOperation: Operation<
  BatchUpdateProfilesServerInput,
  BatchUpdateProfilesServerOutput,
  HandlerContext
> = async (input, context) => {
  if (!(await isUserAdmin(context.profileId))) {
    throw new BadRequestError({ message: 'Only administrators can batch manage user profiles.' });
  }

  const userPoolId = getConfiguredUserPoolId();
  const duplicateProfileIds = getDuplicateProfileIds(input.updates.map((update) => update.profileId));
  const results: BatchResult[] = [];

  for (const [index, update] of input.updates.entries()) {
    const rowNumber = update.rowNumber ?? index + 1;

    try {
      if (duplicateProfileIds.has(update.profileId)) {
        throw new BadRequestError({ message: 'Duplicate profileId in batch.' });
      }

      validateRole(update.role);
      validateQuotaValue(update.maxTotalComputeMinutes, 'maxTotalComputeMinutes');
      validateQuotaValue(update.maxModelCount, 'maxModelCount');

      if (
        update.role === undefined &&
        update.maxTotalComputeMinutes === undefined &&
        update.maxModelCount === undefined
      ) {
        throw new BadRequestError({ message: 'At least one role or quota field must be provided.' });
      }

      if (update.role !== undefined && update.profileId === context.profileId) {
        throw new BadRequestError({ message: 'Administrators cannot change their own role.' });
      }

      if (update.role !== undefined && update.profileId.startsWith('admin')) {
        throw new BadRequestError({ message: 'The default administrator role cannot be changed.' });
      }

      if (update.role !== undefined) {
        await replaceUserGroups(userPoolId, update.profileId, update.role);
      }

      const quotaUpdates = {
        ...(update.maxTotalComputeMinutes !== undefined && {
          maxTotalComputeMinutes: update.maxTotalComputeMinutes,
        }),
        ...(update.maxModelCount !== undefined && { maxModelCount: update.maxModelCount }),
      };

      if (Object.keys(quotaUpdates).length > 0) {
        await profileDao.update({ profileId: update.profileId as ResourceId }, quotaUpdates);
      }

      results.push({
        rowNumber,
        profileId: update.profileId,
        status: BatchProfileOperationStatus.SUCCEEDED,
        message: 'Profile updated successfully.',
      });
    } catch (error) {
      results.push({
        rowNumber,
        profileId: update.profileId,
        status: BatchProfileOperationStatus.FAILED,
        message: getErrorMessage(error),
      });
    }
  }

  return {
    summary: buildSummary(results),
    results,
  };
};

function getDuplicateProfileIds(profileIds: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const profileId of profileIds) {
    if (seen.has(profileId)) {
      duplicates.add(profileId);
    }
    seen.add(profileId);
  }

  return duplicates;
}

function buildSummary(results: BatchResult[]) {
  const succeeded = results.filter((result) => result.status === BatchProfileOperationStatus.SUCCEEDED).length;

  return {
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unknown error occurred.';
}

export const lambdaHandler = getApiGatewayHandler(
  getBatchUpdateProfilesHandler(instrumentOperation(BatchUpdateProfilesOperation)),
);
