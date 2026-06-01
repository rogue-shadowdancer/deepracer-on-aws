// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BatchProfileOperationStatus, Profile } from '@deepracer-indy/typescript-client';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Mock, vi } from 'vitest';

import { useAppDispatch } from '#hooks/useAppDispatch';
import { useBatchUpdateProfilesMutation } from '#services/deepRacer/profileApi';
import { render } from '#utils/testUtils';

import BatchUpdateUsersModal from '../BatchUpdateUsersModal';

vi.mock('#hooks/useAppDispatch', () => ({
  useAppDispatch: vi.fn(),
}));

vi.mock('#services/deepRacer/profileApi', () => ({
  useBatchUpdateProfilesMutation: vi.fn(),
}));

const selectedUsers: Profile[] = [
  {
    profileId: 'profile-1',
    alias: 'student1',
    avatar: 'avatar1',
  } as Profile,
  {
    profileId: 'profile-2',
    alias: 'student2',
    avatar: 'avatar2',
  } as Profile,
];

describe('BatchUpdateUsersModal', () => {
  const mockSetIsOpen = vi.fn();
  const mockDispatch = vi.fn();
  const mockBatchUpdateProfiles = vi.fn();
  const mockOnClearSelection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppDispatch as unknown as Mock).mockReturnValue(mockDispatch);
    (useBatchUpdateProfilesMutation as Mock).mockReturnValue([mockBatchUpdateProfiles, { isLoading: false }]);
  });

  it('requires at least one selected update field', async () => {
    const user = userEvent.setup();
    render(
      <BatchUpdateUsersModal
        isOpen={true}
        setIsOpen={mockSetIsOpen}
        selectedUsers={selectedUsers}
        onClearSelection={mockOnClearSelection}
      />,
    );

    await user.click(screen.getByText('Update 2 users'));

    expect(screen.getByText('Batch update validation failed')).toBeInTheDocument();
    expect(screen.getByText('Select at least one field to update.')).toBeInTheDocument();
    expect(mockBatchUpdateProfiles).not.toHaveBeenCalled();
  });

  it('submits quota updates for selected users and clears selection on full success', async () => {
    const user = userEvent.setup();
    mockBatchUpdateProfiles.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        summary: { total: 2, succeeded: 2, failed: 0 },
        results: [
          {
            rowNumber: 1,
            profileId: 'profile-1',
            status: BatchProfileOperationStatus.SUCCEEDED,
            message: 'Updated',
          },
          {
            rowNumber: 2,
            profileId: 'profile-2',
            status: BatchProfileOperationStatus.SUCCEEDED,
            message: 'Updated',
          },
        ],
      }),
    });

    render(
      <BatchUpdateUsersModal
        isOpen={true}
        setIsOpen={mockSetIsOpen}
        selectedUsers={selectedUsers}
        onClearSelection={mockOnClearSelection}
      />,
    );

    await user.click(screen.getByText('Update usage limit'));
    await user.type(screen.getByPlaceholderText('Hours, or -1 for unlimited'), '3');
    await user.click(screen.getByText('Update model limit'));
    await user.type(screen.getByPlaceholderText('Models, or -1 for unlimited'), '7');
    await user.click(screen.getByText('Update 2 users'));

    await waitFor(() => {
      expect(mockBatchUpdateProfiles).toHaveBeenCalledWith({
        updates: [
          {
            rowNumber: 1,
            profileId: 'profile-1',
            role: undefined,
            maxTotalComputeMinutes: 180,
            maxModelCount: 7,
          },
          {
            rowNumber: 2,
            profileId: 'profile-2',
            role: undefined,
            maxTotalComputeMinutes: 180,
            maxModelCount: 7,
          },
        ],
      });
    });
    expect(await screen.findByText('Batch results')).toBeInTheDocument();
    expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('keeps the update action disabled when no users are selected', () => {
    render(<BatchUpdateUsersModal isOpen={true} setIsOpen={mockSetIsOpen} selectedUsers={[]} />);

    expect(screen.getByRole('button', { name: 'Update 0 users' })).toBeDisabled();
  });
});
