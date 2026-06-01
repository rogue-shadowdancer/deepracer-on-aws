// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BatchProfileOperationStatus, UserGroups } from '@deepracer-indy/typescript-client';
import { describe, expect, it } from 'vitest';

import { buildFailedInviteCsv, parseInviteCsv } from '../csv';

describe('batch invite csv helpers', () => {
  it('parses valid invite rows and converts usage hours to minutes', () => {
    const { rows, errors } = parseInviteCsv(
      'email,alias,role,usageHours,modelLimit\nstudent@example.com,student01,racer,2.5,5\ncoach@example.com,coach01,facilitator,unlimited,-1\n',
    );

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      {
        rowNumber: 2,
        emailAddress: 'student@example.com',
        alias: 'student01',
        role: UserGroups.RACERS,
        maxTotalComputeMinutes: 150,
        maxModelCount: 5,
        source: {
          email: 'student@example.com',
          alias: 'student01',
          role: 'racer',
          usagehours: '2.5',
          modellimit: '5',
        },
      },
      {
        rowNumber: 3,
        emailAddress: 'coach@example.com',
        alias: 'coach01',
        role: UserGroups.RACE_FACILITATORS,
        maxTotalComputeMinutes: -1,
        maxModelCount: -1,
        source: {
          email: 'coach@example.com',
          alias: 'coach01',
          role: 'facilitator',
          usagehours: 'unlimited',
          modellimit: '-1',
        },
      },
    ]);
  });

  it('reports duplicate rows, invalid email, invalid role, and invalid quota values', () => {
    const { rows, errors } = parseInviteCsv(
      [
        'email,alias,role,usageHours,modelLimit',
        'bad-email,no,owner,-2,1.5',
        'student@example.com,student01,racer,1,2',
        'student@example.com,student02,racer,1,2',
      ].join('\n'),
    );

    expect(rows).toEqual([]);
    expect(errors).toEqual([
      {
        rowNumber: 2,
        message:
          'Email address is invalid. Alias must be 3-20 characters and use only letters, numbers, underscores, or hyphens. Role must be racer, race facilitator, admin, or a DeepRacer role group name. usageHours must be -1 or a non-negative number. modelLimit must be -1 or a non-negative integer.',
      },
      {
        rowNumber: 3,
        message: 'Email address is duplicated in this CSV.',
      },
      {
        rowNumber: 4,
        message: 'Email address is duplicated in this CSV.',
      },
    ]);
  });

  it('builds a failed rows csv with server messages', () => {
    const { rows } = parseInviteCsv(
      'email,alias,role,usageHours,modelLimit\nstudent@example.com,student01,racer,2,5\n',
    );

    const csv = buildFailedInviteCsv(
      [
        {
          rowNumber: 2,
          emailAddress: 'student@example.com',
          status: BatchProfileOperationStatus.FAILED,
          message: 'User already exists',
        },
        {
          rowNumber: 3,
          emailAddress: 'ok@example.com',
          status: BatchProfileOperationStatus.SUCCEEDED,
          message: 'Created',
        },
      ],
      rows,
    );

    expect(csv).toBe(
      'email,alias,role,usageHours,modelLimit,error\nstudent@example.com,student01,racer,2,5,User already exists\n',
    );
  });
});
