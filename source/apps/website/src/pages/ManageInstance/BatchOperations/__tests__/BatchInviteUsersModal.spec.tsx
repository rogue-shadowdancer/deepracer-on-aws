// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BatchProfileOperationStatus } from '@deepracer-indy/typescript-client';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Mock, vi } from 'vitest';

import { useAppDispatch } from '#hooks/useAppDispatch';
import { useBatchCreateProfilesMutation } from '#services/deepRacer/profileApi';
import { render } from '#utils/testUtils';

import BatchInviteUsersModal from '../BatchInviteUsersModal';

vi.mock('#hooks/useAppDispatch', () => ({
  useAppDispatch: vi.fn(),
}));

vi.mock('#services/deepRacer/profileApi', () => ({
  useBatchCreateProfilesMutation: vi.fn(),
}));

describe('BatchInviteUsersModal', () => {
  const mockSetIsOpen = vi.fn();
  const mockDispatch = vi.fn();
  const mockBatchCreateProfiles = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppDispatch as unknown as Mock).mockReturnValue(mockDispatch);
    (useBatchCreateProfilesMutation as Mock).mockReturnValue([mockBatchCreateProfiles, { isLoading: false }]);
  });

  it('downloads the CSV template', async () => {
    const user = userEvent.setup();
    const { createObjectURL, revokeObjectURL } = mockCsvDownloadUrl('blob:template');

    render(<BatchInviteUsersModal isOpen={true} setIsOpen={mockSetIsOpen} />);

    await user.click(screen.getByText('Download template'));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:template');
  });

  it('validates CSV preview and submits parsed rows', async () => {
    const user = userEvent.setup();
    mockBatchCreateProfiles.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        summary: { total: 1, succeeded: 1, failed: 0 },
        results: [
          {
            rowNumber: 2,
            emailAddress: 'student@example.com',
            status: BatchProfileOperationStatus.SUCCEEDED,
            message: 'Created',
          },
        ],
      }),
    });

    render(<BatchInviteUsersModal isOpen={true} setIsOpen={mockSetIsOpen} />);

    await user.type(
      screen.getByRole('textbox'),
      'email,alias,role,usageHours,modelLimit\nstudent@example.com,student01,racer,2,5\n',
    );
    expect(screen.getByText('student@example.com')).toBeInTheDocument();

    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockBatchCreateProfiles).toHaveBeenCalledWith({
        profiles: [
          {
            rowNumber: 2,
            emailAddress: 'student@example.com',
            alias: 'student01',
            role: 'dr-racers',
            maxTotalComputeMinutes: 120,
            maxModelCount: 5,
          },
        ],
      });
    });
    expect(await screen.findByText('Batch results')).toBeInTheDocument();
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('shows validation errors and keeps submit disabled for invalid CSV', async () => {
    const user = userEvent.setup();
    render(<BatchInviteUsersModal isOpen={true} setIsOpen={mockSetIsOpen} />);

    await user.type(screen.getByRole('textbox'), 'email,alias,role,usageHours,modelLimit\nbad,nope,owner,-2,1.5\n');

    expect(screen.getByText('CSV validation failed')).toBeInTheDocument();
    expect(screen.getByText(/Email address is invalid/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('exports failed result rows after submit', async () => {
    const user = userEvent.setup();
    const { createObjectURL, revokeObjectURL } = mockCsvDownloadUrl('blob:failed');
    mockBatchCreateProfiles.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        summary: { total: 1, succeeded: 0, failed: 1 },
        results: [
          {
            rowNumber: 2,
            emailAddress: 'student@example.com',
            status: BatchProfileOperationStatus.FAILED,
            message: 'User already exists',
          },
        ],
      }),
    });

    render(<BatchInviteUsersModal isOpen={true} setIsOpen={mockSetIsOpen} />);

    await user.type(
      screen.getByRole('textbox'),
      'email,alias,role,usageHours,modelLimit\nstudent@example.com,student01,racer,2,5\n',
    );
    await user.click(screen.getByText('Submit'));
    await user.click(await screen.findByText('Download failed rows'));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:failed');
  });
});

function mockCsvDownloadUrl(url: string) {
  const createObjectURL = vi.fn().mockReturnValue(url);
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectURL,
  });
  return { createObjectURL, revokeObjectURL };
}
