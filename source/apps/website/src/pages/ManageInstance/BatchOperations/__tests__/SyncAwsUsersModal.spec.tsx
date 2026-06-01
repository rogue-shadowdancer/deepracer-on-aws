// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ProfileSyncOperationStatus } from '@deepracer-indy/typescript-client';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Mock, vi } from 'vitest';

import { useAppDispatch } from '#hooks/useAppDispatch';
import { usePreviewProfileSyncQuery, useSyncProfilesMutation } from '#services/deepRacer/profileApi';
import { render } from '#utils/testUtils';

import SyncAwsUsersModal from '../SyncAwsUsersModal';

vi.mock('#hooks/useAppDispatch', () => ({
  useAppDispatch: vi.fn(),
}));

vi.mock('#services/deepRacer/profileApi', () => ({
  usePreviewProfileSyncQuery: vi.fn(),
  useSyncProfilesMutation: vi.fn(),
}));

describe('SyncAwsUsersModal', () => {
  const mockSetIsOpen = vi.fn();
  const mockDispatch = vi.fn();
  const mockSyncProfiles = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppDispatch as unknown as Mock).mockReturnValue(mockDispatch);
    (useSyncProfilesMutation as Mock).mockReturnValue([mockSyncProfiles, { isLoading: false }]);
    (usePreviewProfileSyncQuery as Mock).mockReturnValue({
      data: {
        summary: {
          total: 4,
          unchanged: 0,
          created: 1,
          updated: 1,
          skipped: 1,
          failed: 1,
        },
        results: [
          {
            rowNumber: 1,
            profileId: 'created-profile',
            emailAddress: 'created@example.com',
            status: ProfileSyncOperationStatus.CREATED,
            message: 'Profile will be created.',
          },
          {
            rowNumber: 2,
            profileId: 'updated-profile',
            emailAddress: 'updated@example.com',
            status: ProfileSyncOperationStatus.UPDATED,
            message: 'Profile will be updated: role.',
          },
          {
            rowNumber: 3,
            profileId: 'skipped-profile',
            emailAddress: 'skipped@example.com',
            status: ProfileSyncOperationStatus.SKIPPED,
            message: 'No DeepRacer role group.',
          },
          {
            rowNumber: 4,
            profileId: 'failed-profile',
            emailAddress: 'failed@example.com',
            status: ProfileSyncOperationStatus.FAILED,
            message: 'Unable to inspect groups.',
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: mockRefetch,
    });
  });

  it('opens the modal and loads the sync preview', () => {
    render(<SyncAwsUsersModal isOpen={true} setIsOpen={mockSetIsOpen} />);

    expect(usePreviewProfileSyncQuery).toHaveBeenCalledWith(undefined, { skip: false });
    expect(screen.getByText('Sync AWS users')).toBeInTheDocument();
    expect(screen.getByText('created@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Created').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Updated').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Skipped').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
  });

  it('disables apply when there are no actionable changes', () => {
    (usePreviewProfileSyncQuery as Mock).mockReturnValue({
      data: {
        summary: {
          total: 1,
          unchanged: 1,
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
        },
        results: [
          {
            rowNumber: 1,
            profileId: 'profile-1',
            emailAddress: 'student@example.com',
            status: ProfileSyncOperationStatus.UNCHANGED,
            message: 'Profile is already in sync.',
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: mockRefetch,
    });

    render(<SyncAwsUsersModal isOpen={true} setIsOpen={mockSetIsOpen} />);

    expect(screen.getByRole('button', { name: 'Apply sync' })).toBeDisabled();
  });

  it('applies sync, shows applied results, and dispatches success', async () => {
    const user = userEvent.setup();
    mockSyncProfiles.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        summary: {
          total: 1,
          unchanged: 0,
          created: 1,
          updated: 0,
          skipped: 0,
          failed: 0,
        },
        results: [
          {
            rowNumber: 1,
            profileId: 'created-profile',
            emailAddress: 'created@example.com',
            status: ProfileSyncOperationStatus.CREATED,
            message: 'Profile created.',
          },
        ],
      }),
    });

    render(<SyncAwsUsersModal isOpen={true} setIsOpen={mockSetIsOpen} />);

    await user.click(screen.getByRole('button', { name: 'Apply sync' }));

    await waitFor(() => {
      expect(mockSyncProfiles).toHaveBeenCalled();
    });
    expect(await screen.findByText('Profile created.')).toBeInTheDocument();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('refreshes preview and clears applied results', async () => {
    const user = userEvent.setup();
    mockRefetch.mockResolvedValue({});

    render(<SyncAwsUsersModal isOpen={true} setIsOpen={mockSetIsOpen} />);

    await user.click(screen.getByRole('button', { name: 'Refresh preview' }));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
