// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Badge, Box, Header, Table } from '@cloudscape-design/components';
import { BatchProfileOperationResult } from '@deepracer-indy/typescript-client';

const BatchResultsTable = ({ results }: { results: BatchProfileOperationResult[] }) => (
  <Table
    columnDefinitions={[
      {
        id: 'rowNumber',
        header: 'Row',
        cell: (item) => item.rowNumber,
      },
      {
        id: 'target',
        header: 'Target',
        cell: (item) => item.emailAddress || item.profileId || '-/-',
      },
      {
        id: 'status',
        header: 'Status',
        cell: (item) => (
          <Badge color={item.status === 'SUCCEEDED' ? 'green' : 'red'}>
            {item.status === 'SUCCEEDED' ? 'Succeeded' : 'Failed'}
          </Badge>
        ),
      },
      {
        id: 'message',
        header: 'Message',
        cell: (item) => item.message,
      },
    ]}
    items={results}
    empty={<Box textAlign="center">No results</Box>}
    header={<Header counter={`(${results.length})`}>Batch results</Header>}
  />
);

export default BatchResultsTable;
