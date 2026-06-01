// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Alert, AppLayout, Button, Header, SpaceBetween } from '@cloudscape-design/components';
import { Profile, UserGroups } from '@deepracer-indy/typescript-client';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useGetProfileQuery, useListProfilesQuery } from '#services/deepRacer/profileApi.js';
import { checkUserGroupMembership } from '#utils/authUtils.js';

import { BatchInviteUsersModal, BatchUpdateUsersModal, SyncAwsUsersModal } from './BatchOperations';
import ChangeUserRoleModal from './ChangeUserRoleModal';
import DeleteUserModal from './DeleteUserModal';
import DeleteUserModelsModal from './DeleteUserModelsModal';
import InviteUserModal from './InviteUserModal/InviteUserModal.js';
import ProfilesTable from './ProfilesTable/ProfilesTable';
import InstanceQuotasModal from './QuotasModal/InstanceQuotas';
import NewUserQuotasModal from './QuotasModal/NewUserQuotas';
import UserQuotasModal from './QuotasModal/UserQuotas';
import UsageSummary from './UsageSummary/UsageSummary';

const ManageInstance = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInstanceQuotasModalOpen, setIsInstanceQuotasModalOpen] = useState<boolean>(false);
  const [isNewUserQuotasModalOpen, setIsNewUserQuotasModalOpen] = useState<boolean>(false);
  const [isInviteUserModalOpen, setIsInviteUserModalOpen] = useState<boolean>(false);
  const [isBatchInviteUsersModalOpen, setIsBatchInviteUsersModalOpen] = useState<boolean>(false);
  const [isBatchUpdateUsersModalOpen, setIsBatchUpdateUsersModalOpen] = useState<boolean>(false);
  const [isSyncAwsUsersModalOpen, setIsSyncAwsUsersModalOpen] = useState<boolean>(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState<boolean>(false);
  const [isDeleteUserModelsModalOpen, setIsDeleteUserModelsModalOpen] = useState<boolean>(false);
  const [isUserQuotasModalOpen, setIsUserQuotasModalOpen] = useState<boolean>(false);
  const [isChangeUserRoleModalOpen, setIsChangeUserRoleModalOpen] = useState<boolean>(false);
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<Profile | null>(null);
  const [selectedUserForModelsDelete, setSelectedUserForModelsDelete] = useState<Profile | null>(null);
  const [selectedUserForQuotas, setSelectedUserForQuotas] = useState<Profile | null>(null);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<Profile | null>(null);
  const [selectedUsersForBatchUpdate, setSelectedUsersForBatchUpdate] = useState<Profile[]>([]);
  const [clearTableSelection, setClearTableSelection] = useState<(() => void) | null>(null);

  const profiles = useListProfilesQuery();
  if (profiles.data === undefined) {
    profiles.data = [];
  }

  const currentUserProfile = useGetProfileQuery();

  useEffect(() => {
    const checkAdminStatus = async () => {
      setIsAdmin(await checkUserGroupMembership([UserGroups.ADMIN]));
      setIsLoading(false);
    };

    void checkAdminStatus();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <Alert type="error" header="Unauthorized">
        <p>The page you are trying to view is only available to administrators.</p>
        <Link to="/">Return to Home</Link>
      </Alert>
    );
  }

  return (
    <>
      <AppLayout
        content={
          <SpaceBetween size="l">
            <Header
              variant="h1"
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button onClick={() => setIsInstanceQuotasModalOpen(true)}>Instance quotas</Button>
                  <Button onClick={() => setIsNewUserQuotasModalOpen(true)}>New user quotas</Button>
                  <Button onClick={() => setIsBatchInviteUsersModalOpen(true)}>Batch invite users</Button>
                  <Button onClick={() => setIsSyncAwsUsersModalOpen(true)}>Sync AWS users</Button>
                </SpaceBetween>
              }
            >
              Instance management
            </Header>

            <UsageSummary profiles={profiles.data} />

            <ProfilesTable
              profiles={profiles.data}
              currentUserProfileId={currentUserProfile.data?.profileId}
              onInviteUser={() => setIsInviteUserModalOpen(true)}
              onDeleteUser={(user: Profile, clearSelection: () => void) => {
                setSelectedUserToDelete(user);
                setClearTableSelection(() => clearSelection);
                setIsDeleteUserModalOpen(true);
              }}
              onDeleteUserModels={(user: Profile) => {
                setSelectedUserForModelsDelete(user);
                setIsDeleteUserModelsModalOpen(true);
              }}
              onUpdateUserQuotas={(user: Profile, clearSelection: () => void) => {
                setSelectedUserForQuotas(user);
                setClearTableSelection(() => clearSelection);
                setIsUserQuotasModalOpen(true);
              }}
              onChangeUserRole={(user: Profile, clearSelection: () => void) => {
                setSelectedUserForRoleChange(user);
                setClearTableSelection(() => clearSelection);
                setIsChangeUserRoleModalOpen(true);
              }}
              onBatchUpdateUsers={(users: Profile[], clearSelection: () => void) => {
                setSelectedUsersForBatchUpdate(users);
                setClearTableSelection(() => clearSelection);
                setIsBatchUpdateUsersModalOpen(true);
              }}
            />
          </SpaceBetween>
        }
        contentType="default"
        navigationHide
        toolsHide
      />
      <InviteUserModal isOpen={isInviteUserModalOpen} setIsOpen={setIsInviteUserModalOpen} />
      <BatchInviteUsersModal isOpen={isBatchInviteUsersModalOpen} setIsOpen={setIsBatchInviteUsersModalOpen} />
      <SyncAwsUsersModal isOpen={isSyncAwsUsersModalOpen} setIsOpen={setIsSyncAwsUsersModalOpen} />
      <BatchUpdateUsersModal
        isOpen={isBatchUpdateUsersModalOpen}
        setIsOpen={setIsBatchUpdateUsersModalOpen}
        selectedUsers={selectedUsersForBatchUpdate}
        onClearSelection={clearTableSelection}
      />
      <DeleteUserModal
        isOpen={isDeleteUserModalOpen}
        setIsOpen={setIsDeleteUserModalOpen}
        selectedUser={selectedUserToDelete}
        onClearSelection={clearTableSelection}
      />
      <DeleteUserModelsModal
        isOpen={isDeleteUserModelsModalOpen}
        setIsOpen={setIsDeleteUserModelsModalOpen}
        selectedUser={selectedUserForModelsDelete}
      />
      <InstanceQuotasModal isOpen={isInstanceQuotasModalOpen} setIsOpen={setIsInstanceQuotasModalOpen} />
      <NewUserQuotasModal isOpen={isNewUserQuotasModalOpen} setIsOpen={setIsNewUserQuotasModalOpen} />
      <UserQuotasModal
        isOpen={isUserQuotasModalOpen}
        setIsOpen={setIsUserQuotasModalOpen}
        selectedUser={selectedUserForQuotas}
        onClearSelection={clearTableSelection}
      />
      <ChangeUserRoleModal
        isOpen={isChangeUserRoleModalOpen}
        setIsOpen={setIsChangeUserRoleModalOpen}
        selectedUser={selectedUserForRoleChange}
        onClearSelection={clearTableSelection}
      />
    </>
  );
};

export default ManageInstance;
