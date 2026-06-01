// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BatchProfileOperationResult, UserGroups } from '@deepracer-indy/typescript-client';

export const BATCH_INVITE_TEMPLATE =
  'email,alias,role,usageHours,modelLimit\nstudent@example.com,student01,racer,2,5\n';

export interface ParsedInviteRow {
  rowNumber: number;
  emailAddress: string;
  alias?: string;
  role?: UserGroups;
  maxTotalComputeMinutes?: number;
  maxModelCount?: number;
  source: Record<string, string>;
}

export interface CsvValidationError {
  rowNumber: number;
  message: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const ALIAS_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

const ROLE_ALIASES: Record<string, UserGroups> = {
  admin: UserGroups.ADMIN,
  'dr-admins': UserGroups.ADMIN,
  facilitator: UserGroups.RACE_FACILITATORS,
  'race facilitator': UserGroups.RACE_FACILITATORS,
  'race-facilitator': UserGroups.RACE_FACILITATORS,
  'dr-race-facilitators': UserGroups.RACE_FACILITATORS,
  racer: UserGroups.RACERS,
  'dr-racers': UserGroups.RACERS,
};

export function parseInviteCsv(text: string): { rows: ParsedInviteRow[]; errors: CsvValidationError[] } {
  const records = parseCsv(text).filter((record) => record.some((cell) => cell.trim().length > 0));
  if (records.length === 0) {
    return { rows: [], errors: [{ rowNumber: 1, message: 'CSV file is empty.' }] };
  }

  const headers = records[0].map((header) => normalizeHeader(header));
  const emailIndex = headers.indexOf('email');
  if (emailIndex === -1) {
    return { rows: [], errors: [{ rowNumber: 1, message: 'CSV header must include email.' }] };
  }

  const rows: ParsedInviteRow[] = [];
  const errors: CsvValidationError[] = [];
  const emailCounts = new Map<string, number>();

  records.slice(1).forEach((record) => {
    const email = (record[emailIndex] ?? '').trim().toLowerCase();
    if (email) {
      emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
    }
  });

  records.slice(1).forEach((record, index) => {
    const rowNumber = index + 2;
    const source = Object.fromEntries(
      headers.map((header, headerIndex) => [header, record[headerIndex]?.trim() ?? '']),
    );
    const emailAddress = source.email;
    const rowErrors: string[] = [];

    if (!EMAIL_REGEX.test(emailAddress)) {
      rowErrors.push('Email address is invalid.');
    }
    const duplicateEmailCount = emailCounts.get(emailAddress.toLowerCase()) ?? 0;
    if (duplicateEmailCount > 1) {
      rowErrors.push('Email address is duplicated in this CSV.');
    }

    const alias = source.alias || undefined;
    if (alias && !ALIAS_REGEX.test(alias)) {
      rowErrors.push('Alias must be 3-20 characters and use only letters, numbers, underscores, or hyphens.');
    }

    const role = parseRole(source.role, rowErrors);
    const maxTotalComputeMinutes = parseUsageHours(source.usagehours, rowErrors);
    const maxModelCount = parseModelLimit(source.modellimit, rowErrors);

    if (rowErrors.length > 0) {
      errors.push({ rowNumber, message: rowErrors.join(' ') });
      return;
    }

    rows.push({
      rowNumber,
      emailAddress,
      alias,
      role,
      maxTotalComputeMinutes,
      maxModelCount,
      source,
    });
  });

  return { rows, errors };
}

export function buildFailedInviteCsv(results: BatchProfileOperationResult[], rows: ParsedInviteRow[]) {
  const rowByNumber = new Map(rows.map((row) => [row.rowNumber, row]));
  const failedRows = results.filter((result) => result.status === 'FAILED');
  const lines = ['email,alias,role,usageHours,modelLimit,error'];

  for (const result of failedRows) {
    const row = rowByNumber.get(result.rowNumber);
    lines.push(
      [
        row?.source.email ?? result.emailAddress ?? '',
        row?.source.alias ?? '',
        row?.source.role ?? '',
        row?.source.usagehours ?? '',
        row?.source.modellimit ?? '',
        result.message,
      ]
        .map(escapeCsvCell)
        .join(','),
    );
  }

  return `${lines.join('\n')}\n`;
}

export function downloadCsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentCell = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentCell += '"';
      index++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index++;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  currentRow.push(currentCell);
  rows.push(currentRow);
  return rows;
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, '');
}

function parseRole(value: string | undefined, errors: string[]) {
  if (!value) {
    return undefined;
  }

  const role = ROLE_ALIASES[value.trim().toLowerCase()];
  if (!role) {
    errors.push('Role must be racer, race facilitator, admin, or a DeepRacer role group name.');
  }
  return role;
}

function parseUsageHours(value: string | undefined, errors: string[]) {
  if (!value) {
    return undefined;
  }

  const numericValue = parseNumber(value);
  if (numericValue === undefined || numericValue < -1) {
    errors.push('usageHours must be -1 or a non-negative number.');
    return undefined;
  }

  return numericValue === -1 ? -1 : Math.round(numericValue * 60);
}

function parseModelLimit(value: string | undefined, errors: string[]) {
  if (!value) {
    return undefined;
  }

  const numericValue = parseNumber(value);
  if (numericValue === undefined || !Number.isInteger(numericValue) || numericValue < -1) {
    errors.push('modelLimit must be -1 or a non-negative integer.');
    return undefined;
  }

  return numericValue;
}

function parseNumber(value: string) {
  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === 'unlimited') {
    return -1;
  }

  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
