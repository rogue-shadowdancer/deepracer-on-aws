// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Alert,
  Badge,
  Box,
  Button,
  ColumnLayout,
  Header,
  Modal,
  SpaceBetween,
  Table,
} from '@cloudscape-design/components';
import {
  type ProfileSyncOperationResult,
  ProfileSyncOperationStatus,
  type ProfileSyncOperationSummary,
  type SyncProfilesCommandOutput,
} from '@deepracer-indy/typescript-client';
import { useState } from 'react';

import { useAppDispatch } from '#hooks/useAppDispatch';
import { usePreviewProfileSyncQuery, useSyncProfilesMutation } from '#services/deepRacer/profileApi';
import { displayErrorNotification, displaySuccessNotification } from '#store/notifications/notificationsSlice';

interface SyncAwsUsersModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const SyncAwsUsersModal = ({ isOpen, setIsOpen }: SyncAwsUsersModalProps) => {
  const dispatch = useAppDispatch();
  const preview = usePreviewProfileSyncQuery(undefined, { skip: !isOpen });
  const [syncProfiles, { isLoading: isApplying }] = useSyncProfilesMutation();
  const [appliedResult, setAppliedResult] = useState<Pick<SyncProfilesCommandOutput, 'summary' | 'results'> | null>(
    null,
  );

  const displayedResult = appliedResult ?? preview.data;
  const summary = displayedResult?.summary;
  const results = displayedResult?.results ?? [];
  const actionableChanges = preview.data ? preview.data.summary.created + preview.data.summary.updated : 0;

  const handleClose = () => {
    setAppliedResult(null);
    setIsOpen(false);
  };

  const handleRefreshPreview = async () => {
    setAppliedResult(null);
    await preview.refetch();
  };

  const handleApply = async () => {
    try {
      const response = await syncProfiles().unwrap();
      setAppliedResult(response);
      dispatch(
        displaySuccessNotification({
          content: `AWS user sync completed: ${response.summary.created} created, ${response.summary.updated} updated, ${response.summary.failed} failed.`,
        }),
      );
    } catch {
      dispatch(
        displayErrorNotification({
          content: 'Failed to sync AWS users. Please try again.',
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
      header="Sync AWS users"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button onClick={handleClose}>Close</Button>
            <Button onClick={handleRefreshPreview} loading={preview.isFetching} disabled={preview.isFetching}>
              Refresh preview
            </Button>
            <Button
              variant="primary"
              onClick={handleApply}
              loading={isApplying}
              disabled={preview.isLoading || preview.isFetching || actionableChanges === 0 || appliedResult !== null}
            >
              Apply sync
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {preview.isError && (
          <Alert type="error" header="Sync preview failed">
            Unable to load the AWS user sync preview.
          </Alert>
        )}

        {summary && <SyncSummary summary={summary} />}

        <SyncResultsTable results={results} loading={preview.isLoading || preview.isFetching} />
      </SpaceBetween>
    </Modal>
  );
};

const SyncSummary = ({ summary }: { summary: ProfileSyncOperationSummary }) => (
  <ColumnLayout columns={3}>
    <Metric label="Total" value={summary.total} />
    <Metric label="Created" value={summary.created} />
    <Metric label="Updated" value={summary.updated} />
    <Metric label="Unchanged" value={summary.unchanged} />
    <Metric label="Skipped" value={summary.skipped} />
    <Metric label="Failed" value={summary.failed} />
  </ColumnLayout>
);

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div>
    <Box variant="awsui-key-label">{label}</Box>
    <Box variant="h2">{value}</Box>
  </div>
);

const SyncResultsTable = ({ results, loading }: { results: ProfileSyncOperationResult[]; loading: boolean }) => (
  <Table
    loading={loading}
    columnDefinitions={[
      {
        id: 'rowNumber',
        header: 'Row',
        cell: (item) => item.rowNumber,
      },
      {
        id: 'profileId',
        header: 'Profile ID',
        cell: (item) => item.profileId || '-/-',
      },
      {
        id: 'emailAddress',
        header: 'Email',
        cell: (item) => item.emailAddress || '-/-',
      },
      {
        id: 'status',
        header: 'Status',
        cell: (item) => <StatusBadge status={item.status} />,
      },
      {
        id: 'message',
        header: 'Message',
        cell: (item) => item.message,
      },
    ]}
    items={results}
    empty={<Box textAlign="center">No sync results</Box>}
    header={<Header counter={`(${results.length})`}>Sync preview</Header>}
  />
);

const StatusBadge = ({ status }: { status: ProfileSyncOperationStatus }) => (
  <Badge color={getStatusColor(status)}>{formatStatus(status)}</Badge>
);

function getStatusColor(status: ProfileSyncOperationStatus) {
  switch (status) {
    case ProfileSyncOperationStatus.CREATED:
    case ProfileSyncOperationStatus.UPDATED:
      return 'blue';
    case ProfileSyncOperationStatus.UNCHANGED:
      return 'green';
    case ProfileSyncOperationStatus.FAILED:
      return 'red';
    default:
      return 'grey';
  }
}

function formatStatus(status: ProfileSyncOperationStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default SyncAwsUsersModal;
