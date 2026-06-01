// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Operation } from '@aws-smithy/server-common';
import { profileDao } from '@deepracer-indy/database';
import {
  BadRequestError,
  BatchCreateProfilesServerInput,
  BatchCreateProfilesServerOutput,
  BatchProfileOperationStatus,
  getBatchCreateProfilesHandler,
} from '@deepracer-indy/typescript-server-client';

import type { HandlerContext } from '../types/apiGatewayHandlerContext.js';
import { getApiGatewayHandler, isUserAdmin } from '../utils/apiGateway.js';
import { instrumentOperation } from '../utils/instrumentation/instrumentOperation.js';
import { createProfileUser, validateQuotaValue, validateRole } from '../utils/profileManagement.js';

type BatchResult = BatchCreateProfilesServerOutput['results'][number];

export const BatchCreateProfilesOperation: Operation<
  BatchCreateProfilesServerInput,
  BatchCreateProfilesServerOutput,
  HandlerContext
> = async (input, context) => {
  if (!(await isUserAdmin(context.profileId))) {
    throw new BadRequestError({ message: 'Only administrators can batch manage user profiles.' });
  }

  const duplicateEmails = getDuplicateEmails(input.profiles.map((profile) => profile.emailAddress));
  const results: BatchResult[] = [];

  for (const [index, profile] of input.profiles.entries()) {
    const rowNumber = profile.rowNumber ?? index + 1;
    const emailAddress = profile.emailAddress.trim();

    try {
      if (duplicateEmails.has(emailAddress.toLowerCase())) {
        throw new BadRequestError({ message: 'Duplicate email address in batch.' });
      }

      validateRole(profile.role);
      validateQuotaValue(profile.maxTotalComputeMinutes, 'maxTotalComputeMinutes');
      validateQuotaValue(profile.maxModelCount, 'maxModelCount');

      const profileId = await createProfileUser({
        emailAddress,
        alias: profile.alias,
        role: profile.role,
      });

      const quotaUpdates = {
        ...(profile.maxTotalComputeMinutes !== undefined && {
          maxTotalComputeMinutes: profile.maxTotalComputeMinutes,
        }),
        ...(profile.maxModelCount !== undefined && { maxModelCount: profile.maxModelCount }),
      };

      if (Object.keys(quotaUpdates).length > 0) {
        await profileDao.update({ profileId }, quotaUpdates);
      }

      results.push({
        rowNumber,
        emailAddress,
        profileId,
        status: BatchProfileOperationStatus.SUCCEEDED,
        message: 'Profile created successfully.',
      });
    } catch (error) {
      results.push({
        rowNumber,
        emailAddress,
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

function getDuplicateEmails(emailAddresses: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const emailAddress of emailAddresses) {
    const normalizedEmail = emailAddress.trim().toLowerCase();
    if (seen.has(normalizedEmail)) {
      duplicates.add(normalizedEmail);
    }
    seen.add(normalizedEmail);
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
  getBatchCreateProfilesHandler(instrumentOperation(BatchCreateProfilesOperation)),
);
