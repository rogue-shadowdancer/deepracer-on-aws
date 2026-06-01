// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Alert,
  Box,
  Button,
  ColumnLayout,
  Form,
  Header,
  Modal,
  SpaceBetween,
  Table,
  Textarea,
} from '@cloudscape-design/components';
import { BatchCreateProfilesCommandOutput } from '@deepracer-indy/typescript-client';
import { ChangeEvent, useMemo, useState } from 'react';

import { useAppDispatch } from '#hooks/useAppDispatch';
import { useBatchCreateProfilesMutation } from '#services/deepRacer/profileApi';
import { displayErrorNotification, displaySuccessNotification } from '#store/notifications/notificationsSlice';

import BatchResultsTable from './BatchResultsTable';
import { BATCH_INVITE_TEMPLATE, buildFailedInviteCsv, downloadCsv, parseInviteCsv, ParsedInviteRow } from './csv';

interface BatchInviteUsersModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const BatchInviteUsersModal = ({ isOpen, setIsOpen }: BatchInviteUsersModalProps) => {
  const dispatch = useAppDispatch();
  const [batchCreateProfiles, { isLoading }] = useBatchCreateProfilesMutation();
  const [csvText, setCsvText] = useState('');
  const [results, setResults] = useState<BatchCreateProfilesCommandOutput['results']>([]);

  const parsedCsv = useMemo(() => parseInviteCsv(csvText), [csvText]);
  const canSubmit = parsedCsv.rows.length > 0 && parsedCsv.errors.length === 0;

  const handleClose = () => {
    setCsvText('');
    setResults([]);
    setIsOpen(false);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setCsvText(await file.text());
    setResults([]);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    try {
      const response = await batchCreateProfiles({
        profiles: parsedCsv.rows.map((row) => ({
          rowNumber: row.rowNumber,
          emailAddress: row.emailAddress,
          alias: row.alias,
          role: row.role,
          maxTotalComputeMinutes: row.maxTotalComputeMinutes,
          maxModelCount: row.maxModelCount,
        })),
      }).unwrap();

      setResults(response.results);
      dispatch(
        displaySuccessNotification({
          content: `Batch invite completed: ${response.summary.succeeded} succeeded, ${response.summary.failed} failed.`,
        }),
      );
    } catch {
      dispatch(
        displayErrorNotification({
          content: 'Failed to submit batch invite. Please try again.',
        }),
      );
    }
  };

  const handleDownloadFailures = () => {
    downloadCsv('failed-batch-invites.csv', buildFailedInviteCsv(results, parsedCsv.rows));
  };

  return (
    <Modal
      onDismiss={handleClose}
      visible={isOpen}
      closeAriaLabel="Close modal"
      size="large"
      header="Batch invite users"
    >
      <SpaceBetween size="l">
        <Form
          actions={
            <SpaceBetween size="xs" direction="horizontal">
              <Button formAction="none" onClick={handleClose}>
                Close
              </Button>
              <Button formAction="none" onClick={() => downloadCsv('batch-invite-template.csv', BATCH_INVITE_TEMPLATE)}>
                Download template
              </Button>
              <Button
                variant="primary"
                formAction="none"
                loading={isLoading}
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                Submit
              </Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="m">
            <ColumnLayout columns={2}>
              <input aria-label="Upload CSV" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
              <Textarea
                value={csvText}
                onChange={({ detail }) => {
                  setCsvText(detail.value);
                  setResults([]);
                }}
                placeholder={BATCH_INVITE_TEMPLATE}
                rows={6}
              />
            </ColumnLayout>

            {parsedCsv.errors.length > 0 && (
              <Alert type="error" header="CSV validation failed">
                {parsedCsv.errors.map((error) => (
                  <div key={`${error.rowNumber}-${error.message}`}>
                    Row {error.rowNumber}: {error.message}
                  </div>
                ))}
              </Alert>
            )}

            <PreviewTable rows={parsedCsv.rows} />
          </SpaceBetween>
        </Form>

        {results.length > 0 && (
          <SpaceBetween size="m">
            {results.some((result) => result.status === 'FAILED') && (
              <Box>
                <Button onClick={handleDownloadFailures}>Download failed rows</Button>
              </Box>
            )}
            <BatchResultsTable results={results} />
          </SpaceBetween>
        )}
      </SpaceBetween>
    </Modal>
  );
};

const PreviewTable = ({ rows }: { rows: ParsedInviteRow[] }) => (
  <Table
    columnDefinitions={[
      { id: 'row', header: 'Row', cell: (item) => item.rowNumber },
      { id: 'email', header: 'Email', cell: (item) => item.emailAddress },
      { id: 'alias', header: 'Alias', cell: (item) => item.alias || '-/-' },
      { id: 'role', header: 'Role', cell: (item) => item.role || 'Default' },
      {
        id: 'usage',
        header: 'Usage limit',
        cell: (item) =>
          item.maxTotalComputeMinutes === undefined
            ? 'Default'
            : item.maxTotalComputeMinutes === -1
              ? 'Unlimited'
              : `${item.maxTotalComputeMinutes / 60} hours`,
      },
      {
        id: 'models',
        header: 'Model limit',
        cell: (item) =>
          item.maxModelCount === undefined ? 'Default' : item.maxModelCount === -1 ? 'Unlimited' : item.maxModelCount,
      },
    ]}
    items={rows}
    empty={<Box textAlign="center">No valid rows</Box>}
    header={<Header counter={`(${rows.length})`}>Preview</Header>}
  />
);

export default BatchInviteUsersModal;
