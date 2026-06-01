// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Alert, Button, Checkbox, Form, Input, Modal, Select, SpaceBetween } from '@cloudscape-design/components';
import { BatchUpdateProfilesCommandOutput, Profile } from '@deepracer-indy/typescript-client';
import { useState } from 'react';

import { useAppDispatch } from '#hooks/useAppDispatch';
import { useBatchUpdateProfilesMutation } from '#services/deepRacer/profileApi';
import { displayErrorNotification, displaySuccessNotification } from '#store/notifications/notificationsSlice';

import BatchResultsTable from './BatchResultsTable';
import { roleOptions } from '../ChangeUserRoleModal/constants';

interface BatchUpdateUsersModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedUsers: Profile[];
  onClearSelection?: (() => void) | null;
}

const BatchUpdateUsersModal = ({ isOpen, setIsOpen, selectedUsers, onClearSelection }: BatchUpdateUsersModalProps) => {
  const dispatch = useAppDispatch();
  const [batchUpdateProfiles, { isLoading }] = useBatchUpdateProfilesMutation();
  const [shouldUpdateRole, setShouldUpdateRole] = useState(false);
  const [shouldUpdateUsage, setShouldUpdateUsage] = useState(false);
  const [shouldUpdateModels, setShouldUpdateModels] = useState(false);
  const [selectedRole, setSelectedRole] = useState(roleOptions[0]);
  const [usageHours, setUsageHours] = useState('');
  const [modelLimit, setModelLimit] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [results, setResults] = useState<BatchUpdateProfilesCommandOutput['results']>([]);

  const handleClose = () => {
    reset();
    setIsOpen(false);
  };

  const reset = () => {
    setShouldUpdateRole(false);
    setShouldUpdateUsage(false);
    setShouldUpdateModels(false);
    setSelectedRole(roleOptions[0]);
    setUsageHours('');
    setModelLimit('');
    setValidationError(null);
    setResults([]);
  };

  const handleSubmit = async () => {
    const parsedUsage = parseUsageHours(usageHours);
    const parsedModelLimit = parseModelLimit(modelLimit);

    if (!shouldUpdateRole && !shouldUpdateUsage && !shouldUpdateModels) {
      setValidationError('Select at least one field to update.');
      return;
    }
    if (shouldUpdateUsage && parsedUsage === undefined) {
      setValidationError('Usage limit must be -1 or a non-negative number of hours.');
      return;
    }
    if (shouldUpdateModels && parsedModelLimit === undefined) {
      setValidationError('Model limit must be -1 or a non-negative integer.');
      return;
    }

    setValidationError(null);

    try {
      const response = await batchUpdateProfiles({
        updates: selectedUsers.map((profile, index) => ({
          rowNumber: index + 1,
          profileId: profile.profileId,
          role: shouldUpdateRole ? selectedRole.value : undefined,
          maxTotalComputeMinutes: shouldUpdateUsage ? parsedUsage : undefined,
          maxModelCount: shouldUpdateModels ? parsedModelLimit : undefined,
        })),
      }).unwrap();

      setResults(response.results);
      dispatch(
        displaySuccessNotification({
          content: `Batch update completed: ${response.summary.succeeded} succeeded, ${response.summary.failed} failed.`,
        }),
      );

      if (response.summary.failed === 0) {
        onClearSelection?.();
      }
    } catch {
      dispatch(
        displayErrorNotification({
          content: 'Failed to submit batch update. Please try again.',
        }),
      );
    }
  };

  return (
    <Modal
      onDismiss={handleClose}
      visible={isOpen}
      closeAriaLabel="Close modal"
      size="large"
      header="Batch update users"
    >
      <SpaceBetween size="l">
        <Form
          actions={
            <SpaceBetween size="xs" direction="horizontal">
              <Button formAction="none" onClick={handleClose}>
                Close
              </Button>
              <Button
                variant="primary"
                formAction="none"
                loading={isLoading}
                disabled={selectedUsers.length === 0}
                onClick={handleSubmit}
              >
                Update {selectedUsers.length} users
              </Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="m">
            {validationError && (
              <Alert type="error" header="Batch update validation failed">
                {validationError}
              </Alert>
            )}
            <Checkbox checked={shouldUpdateRole} onChange={({ detail }) => setShouldUpdateRole(detail.checked)}>
              Update role
            </Checkbox>
            <Select
              selectedOption={selectedRole}
              onChange={({ detail }) => setSelectedRole(detail.selectedOption as typeof selectedRole)}
              options={roleOptions}
              disabled={!shouldUpdateRole}
            />
            <Checkbox checked={shouldUpdateUsage} onChange={({ detail }) => setShouldUpdateUsage(detail.checked)}>
              Update usage limit
            </Checkbox>
            <Input
              value={usageHours}
              onChange={({ detail }) => setUsageHours(detail.value)}
              disabled={!shouldUpdateUsage}
              placeholder="Hours, or -1 for unlimited"
              type="number"
            />
            <Checkbox checked={shouldUpdateModels} onChange={({ detail }) => setShouldUpdateModels(detail.checked)}>
              Update model limit
            </Checkbox>
            <Input
              value={modelLimit}
              onChange={({ detail }) => setModelLimit(detail.value)}
              disabled={!shouldUpdateModels}
              placeholder="Models, or -1 for unlimited"
              type="number"
            />
          </SpaceBetween>
        </Form>
        {results.length > 0 && <BatchResultsTable results={results} />}
      </SpaceBetween>
    </Modal>
  );
};

function parseUsageHours(value: string) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < -1) {
    return undefined;
  }
  return numericValue === -1 ? -1 : Math.round(numericValue * 60);
}

function parseModelLimit(value: string) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < -1) {
    return undefined;
  }
  return numericValue;
}

export default BatchUpdateUsersModal;
