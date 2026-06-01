// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  AvatarConfig,
  BatchCreateProfilesCommand,
  BatchCreateProfilesCommandInput,
  BatchCreateProfilesCommandOutput,
  BatchProfileOperationStatus,
  BatchUpdateProfilesCommand,
  BatchUpdateProfilesCommandInput,
  BatchUpdateProfilesCommandOutput,
  CreateProfileCommand,
  CreateProfileCommandInput,
  CreateProfileCommandOutput,
  DeleteProfileCommand,
  DeleteProfileCommandInput,
  DeleteProfileCommandOutput,
  DeleteProfileModelsCommand,
  DeleteProfileModelsCommandInput,
  DeleteProfileModelsCommandOutput,
  ListProfilesCommand,
  ListProfilesCommandOutput,
  PreviewProfileSyncCommand,
  PreviewProfileSyncCommandOutput,
  Profile,
  ProfileSyncOperationStatus,
  SyncProfilesCommand,
  SyncProfilesCommandOutput,
  UpdateGroupMembershipCommand,
  UpdateGroupMembershipCommandInput,
  UpdateGroupMembershipCommandOutput,
  UpdateProfileCommand,
  UpdateProfileCommandInput,
  UpdateProfileCommandOutput,
  UserGroups,
} from '@deepracer-indy/typescript-client';
import { describe, it, expect } from 'vitest';

import * as profileApiModule from '#services/deepRacer/profileApi';

describe('profileApi', () => {
  describe('createProfileCommand', () => {
    it('should create a CreateProfileCommand with input', () => {
      const input: CreateProfileCommandInput = {
        emailAddress: 'test@example.com',
      };

      const result = profileApiModule.createProfile.createProfileCommand(input);

      expect(result.command).toBeInstanceOf(CreateProfileCommand);
      expect(result.command.input).toEqual(input);
      expect(result.displayNotificationOnError).toBe(false);
    });
  });

  describe('createProfileTransformResponse', () => {
    it('should transform response to message string', () => {
      const mockMessage = 'Profile created successfully';
      const mockResponse: CreateProfileCommandOutput = {
        $metadata: {},
        message: mockMessage,
      };

      const result = profileApiModule.createProfile.createProfileTransformResponse(mockResponse);

      expect(result).toBe(mockMessage);
    });
  });

  describe('deleteProfileCommand', () => {
    it('should create a DeleteProfileCommand with input', () => {
      const input: DeleteProfileCommandInput = {
        profileId: 'test-profile-id',
      };

      const result = profileApiModule.deleteProfile.deleteProfileCommand(input);

      expect(result.command).toBeInstanceOf(DeleteProfileCommand);
      expect(result.command.input).toEqual(input);
      expect(result.displayNotificationOnError).toBe(false);
    });
  });

  describe('deleteProfileTransformResponse', () => {
    it('should transform response to undefined', () => {
      const mockResponse: DeleteProfileCommandOutput = {
        $metadata: {},
      };

      const result = profileApiModule.deleteProfile.deleteProfileTransformResponse(mockResponse);

      expect(result).toBeUndefined();
    });
  });

  describe('deleteProfileModelsCommand', () => {
    it('should create a DeleteProfileModelsCommand with input', () => {
      const input: DeleteProfileModelsCommandInput = {
        profileId: 'test-profile-id',
      };

      const result = profileApiModule.deleteProfileModels.deleteProfileModelsCommand(input);

      expect(result.command).toBeInstanceOf(DeleteProfileModelsCommand);
      expect(result.command.input).toEqual(input);
      expect(result.displayNotificationOnError).toBe(false);
    });
  });

  describe('deleteProfileModelsTransformResponse', () => {
    it('should transform response to undefined', () => {
      const mockResponse: DeleteProfileModelsCommandOutput = {
        $metadata: {},
      };

      const result = profileApiModule.deleteProfileModels.deleteProfileModelsTransformResponse(mockResponse);

      expect(result).toBeUndefined();
    });
  });

  describe('deleteProfile endpoint', () => {
    it('should have deleteProfile endpoint defined', () => {
      expect(profileApiModule.profileApi.endpoints.deleteProfile).toBeDefined();
    });

    it('should export useDeleteProfileMutation hook', () => {
      expect(profileApiModule.profileApi.useDeleteProfileMutation).toBeDefined();
      expect(typeof profileApiModule.profileApi.useDeleteProfileMutation).toBe('function');
    });
  });

  describe('listProfilesCommand', () => {
    it('should create a ListProfilesCommand', () => {
      const result = profileApiModule.listProfiles.listProfilesCommand();

      expect(result.command).toBeInstanceOf(ListProfilesCommand);
      expect(result.displayNotificationOnError).toBe(false);
    });
  });

  describe('listProfilesTransformResponse', () => {
    it('should transform response to profiles array', () => {
      const mockProfiles: Profile[] = [
        {
          profileId: 'profile-1',
          alias: 'User1',
          roleName: 'dr-racers',
          avatar: 'avatar1' as AvatarConfig,
        },
        {
          profileId: 'profile-2',
          alias: 'User2',
          roleName: 'dr-racers',
          avatar: 'avatar2' as AvatarConfig,
        },
      ];

      const mockResponse: ListProfilesCommandOutput = {
        $metadata: {},
        profiles: mockProfiles,
      };

      const result = profileApiModule.listProfiles.listProfilesTransformResponse(mockResponse);

      expect(result).toEqual(mockProfiles);
    });
  });

  describe('updateProfileCommand', () => {
    it('should create an UpdateProfileCommand with input', () => {
      const input: UpdateProfileCommandInput = {
        alias: 'UpdatedAlias',
      };

      const result = profileApiModule.updateProfile.updateProfileCommand(input);

      expect(result.command).toBeInstanceOf(UpdateProfileCommand);
      expect(result.command.input).toEqual(input);
    });
  });

  describe('updateProfileTransformResponse', () => {
    it('should transform response to profile', () => {
      const mockProfile: Profile = {
        profileId: 'test-profile-id',
        alias: 'UpdatedUser',
        roleName: 'dr-racers',
        avatar: 'avatar' as AvatarConfig,
      };

      const mockResponse: UpdateProfileCommandOutput = {
        $metadata: {},
        profile: mockProfile,
      };

      const result = profileApiModule.updateProfile.updateProfileTransformResponse(mockResponse);

      expect(result).toEqual(mockProfile);
    });
  });

  describe('deleteProfileModels endpoint', () => {
    it('should have deleteProfileModels endpoint defined', () => {
      expect(profileApiModule.profileApi.endpoints.deleteProfileModels).toBeDefined();
    });

    it('should export useDeleteProfileModelsMutation hook', () => {
      expect(profileApiModule.profileApi.useDeleteProfileModelsMutation).toBeDefined();
      expect(typeof profileApiModule.profileApi.useDeleteProfileModelsMutation).toBe('function');
    });
  });

  describe('listProfiles endpoint', () => {
    it('should have listProfiles endpoint defined', () => {
      expect(profileApiModule.profileApi.endpoints.listProfiles).toBeDefined();
    });

    it('should export useListProfilesQuery hook', () => {
      expect(profileApiModule.profileApi.useListProfilesQuery).toBeDefined();
      expect(typeof profileApiModule.profileApi.useListProfilesQuery).toBe('function');
    });
  });

  describe('createProfile endpoint', () => {
    it('should have createProfile endpoint defined', () => {
      expect(profileApiModule.profileApi.endpoints.createProfile).toBeDefined();
    });

    it('should export useCreateProfileMutation hook', () => {
      expect(profileApiModule.profileApi.useCreateProfileMutation).toBeDefined();
      expect(typeof profileApiModule.profileApi.useCreateProfileMutation).toBe('function');
    });
  });

  describe('updateProfile endpoint', () => {
    it('should have updateProfile endpoint defined', () => {
      expect(profileApiModule.profileApi.endpoints.updateProfile).toBeDefined();
    });

    it('should export useUpdateProfileMutation hook', () => {
      expect(profileApiModule.profileApi.useUpdateProfileMutation).toBeDefined();
      expect(typeof profileApiModule.profileApi.useUpdateProfileMutation).toBe('function');
    });
  });

  describe('updateGroupMembershipCommand', () => {
    it('should create an UpdateGroupMembershipCommand with input', () => {
      const input: UpdateGroupMembershipCommandInput = {
        profileId: 'test-profile-id',
        targetUserPoolGroup: UserGroups.ADMIN,
      };

      const result = profileApiModule.updateGroupMembership.updateGroupMembershipCommand(input);

      expect(result.command).toBeInstanceOf(UpdateGroupMembershipCommand);
      expect(result.command.input).toEqual(input);
      expect(result.displayNotificationOnError).toBe(false);
    });

    it('should create command with RACERS group', () => {
      const input: UpdateGroupMembershipCommandInput = {
        profileId: 'racer-profile-id',
        targetUserPoolGroup: UserGroups.RACERS,
      };

      const result = profileApiModule.updateGroupMembership.updateGroupMembershipCommand(input);

      expect(result.command).toBeInstanceOf(UpdateGroupMembershipCommand);
      expect(result.command.input.targetUserPoolGroup).toBe(UserGroups.RACERS);
    });

    it('should create command with RACE_FACILITATORS group', () => {
      const input: UpdateGroupMembershipCommandInput = {
        profileId: 'facilitator-profile-id',
        targetUserPoolGroup: UserGroups.RACE_FACILITATORS,
      };

      const result = profileApiModule.updateGroupMembership.updateGroupMembershipCommand(input);

      expect(result.command).toBeInstanceOf(UpdateGroupMembershipCommand);
      expect(result.command.input.targetUserPoolGroup).toBe(UserGroups.RACE_FACILITATORS);
    });
  });

  describe('updateGroupMembershipTransformResponse', () => {
    it('should transform response to undefined', () => {
      const mockResponse: UpdateGroupMembershipCommandOutput = {
        $metadata: {},
      };

      const result = profileApiModule.updateGroupMembership.updateGroupMembershipTransformResponse(mockResponse);

      expect(result).toBeUndefined();
    });

    it('should handle response with additional metadata', () => {
      const mockResponse: UpdateGroupMembershipCommandOutput = {
        $metadata: {
          httpStatusCode: 200,
          requestId: 'test-request-id',
        },
      };

      const result = profileApiModule.updateGroupMembership.updateGroupMembershipTransformResponse(mockResponse);

      expect(result).toBeUndefined();
    });
  });

  describe('updateGroupMembership endpoint', () => {
    it('should have updateGroupMembership endpoint defined', () => {
      expect(profileApiModule.profileApi.endpoints.updateGroupMembership).toBeDefined();
    });

    it('should export useUpdateGroupMembershipMutation hook', () => {
      expect(profileApiModule.profileApi.useUpdateGroupMembershipMutation).toBeDefined();
      expect(typeof profileApiModule.profileApi.useUpdateGroupMembershipMutation).toBe('function');
    });
  });

  describe('batchCreateProfilesCommand', () => {
    it('should create a BatchCreateProfilesCommand with input', () => {
      const input: BatchCreateProfilesCommandInput = {
        profiles: [
          {
            rowNumber: 2,
            emailAddress: 'student@example.com',
            role: UserGroups.RACERS,
            maxTotalComputeMinutes: 120,
            maxModelCount: 5,
          },
        ],
      };

      const result = profileApiModule.batchCreateProfiles.batchCreateProfilesCommand(input);

      expect(result.command).toBeInstanceOf(BatchCreateProfilesCommand);
      expect(result.command.input).toEqual(input);
      expect(result.displayNotificationOnError).toBe(false);
    });
  });

  describe('batchCreateProfilesTransformResponse', () => {
    it('should transform response to summary and results', () => {
      const mockResponse: BatchCreateProfilesCommandOutput = {
        $metadata: {},
        summary: {
          total: 1,
          succeeded: 1,
          failed: 0,
        },
        results: [
          {
            rowNumber: 2,
            emailAddress: 'student@example.com',
            status: BatchProfileOperationStatus.SUCCEEDED,
            message: 'Created',
          },
        ],
      };

      const result = profileApiModule.batchCreateProfiles.batchCreateProfilesTransformResponse(mockResponse);

      expect(result).toEqual({
        summary: mockResponse.summary,
        results: mockResponse.results,
      });
    });
  });

  describe('batchUpdateProfilesCommand', () => {
    it('should create a BatchUpdateProfilesCommand with input', () => {
      const input: BatchUpdateProfilesCommandInput = {
        updates: [
          {
            rowNumber: 1,
            profileId: 'profile-1',
            role: UserGroups.RACE_FACILITATORS,
            maxTotalComputeMinutes: -1,
            maxModelCount: 10,
          },
        ],
      };

      const result = profileApiModule.batchUpdateProfiles.batchUpdateProfilesCommand(input);

      expect(result.command).toBeInstanceOf(BatchUpdateProfilesCommand);
      expect(result.command.input).toEqual(input);
      expect(result.displayNotificationOnError).toBe(false);
    });
  });

  describe('batchUpdateProfilesTransformResponse', () => {
    it('should transform response to summary and results', () => {
      const mockResponse: BatchUpdateProfilesCommandOutput = {
        $metadata: {},
        summary: {
          total: 1,
          succeeded: 0,
          failed: 1,
        },
        results: [
          {
            rowNumber: 1,
            profileId: 'profile-1',
            status: BatchProfileOperationStatus.FAILED,
            message: 'Cannot change own role.',
          },
        ],
      };

      const result = profileApiModule.batchUpdateProfiles.batchUpdateProfilesTransformResponse(mockResponse);

      expect(result).toEqual({
        summary: mockResponse.summary,
        results: mockResponse.results,
      });
    });
  });

  describe('batch profile endpoints', () => {
    it('should define batch endpoints', () => {
      expect(profileApiModule.profileApi.endpoints.batchCreateProfiles).toBeDefined();
      expect(profileApiModule.profileApi.endpoints.batchUpdateProfiles).toBeDefined();
    });

    it('should export batch mutation hooks', () => {
      expect(profileApiModule.profileApi.useBatchCreateProfilesMutation).toBeDefined();
      expect(typeof profileApiModule.profileApi.useBatchCreateProfilesMutation).toBe('function');
      expect(profileApiModule.profileApi.useBatchUpdateProfilesMutation).toBeDefined();
      expect(typeof profileApiModule.profileApi.useBatchUpdateProfilesMutation).toBe('function');
    });
  });

  describe('previewProfileSyncCommand', () => {
    it('should create a PreviewProfileSyncCommand', () => {
      const result = profileApiModule.previewProfileSync.previewProfileSyncCommand();

      expect(result.command).toBeInstanceOf(PreviewProfileSyncCommand);
      expect(result.displayNotificationOnError).toBe(false);
    });
  });

  describe('previewProfileSyncTransformResponse', () => {
    it('should transform response to summary and results', () => {
      const mockResponse: PreviewProfileSyncCommandOutput = {
        $metadata: {},
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
            profileId: 'profile-1',
            emailAddress: 'student@example.com',
            status: ProfileSyncOperationStatus.CREATED,
            message: 'Profile will be created.',
          },
        ],
      };

      const result = profileApiModule.previewProfileSync.previewProfileSyncTransformResponse(mockResponse);

      expect(result).toEqual({
        summary: mockResponse.summary,
        results: mockResponse.results,
      });
    });
  });

  describe('syncProfilesCommand', () => {
    it('should create a SyncProfilesCommand', () => {
      const result = profileApiModule.syncProfiles.syncProfilesCommand();

      expect(result.command).toBeInstanceOf(SyncProfilesCommand);
      expect(result.displayNotificationOnError).toBe(false);
    });
  });

  describe('syncProfilesTransformResponse', () => {
    it('should transform response to summary and results', () => {
      const mockResponse: SyncProfilesCommandOutput = {
        $metadata: {},
        summary: {
          total: 1,
          unchanged: 0,
          created: 0,
          updated: 1,
          skipped: 0,
          failed: 0,
        },
        results: [
          {
            rowNumber: 1,
            profileId: 'profile-1',
            emailAddress: 'student@example.com',
            status: ProfileSyncOperationStatus.UPDATED,
            message: 'Profile updated: role.',
          },
        ],
      };

      const result = profileApiModule.syncProfiles.syncProfilesTransformResponse(mockResponse);

      expect(result).toEqual({
        summary: mockResponse.summary,
        results: mockResponse.results,
      });
    });
  });

  describe('profile sync endpoints', () => {
    it('should define sync endpoints', () => {
      expect(profileApiModule.profileApi.endpoints.previewProfileSync).toBeDefined();
      expect(profileApiModule.profileApi.endpoints.syncProfiles).toBeDefined();
    });

    it('should export sync hooks', () => {
      expect(profileApiModule.profileApi.usePreviewProfileSyncQuery).toBeDefined();
      expect(typeof profileApiModule.profileApi.usePreviewProfileSyncQuery).toBe('function');
      expect(profileApiModule.profileApi.useSyncProfilesMutation).toBeDefined();
      expect(typeof profileApiModule.profileApi.useSyncProfilesMutation).toBe('function');
    });
  });

  describe('updateGroupMembership integration', () => {
    it('should handle all user group types', () => {
      const userGroups = [UserGroups.RACERS, UserGroups.RACE_FACILITATORS, UserGroups.ADMIN];

      userGroups.forEach((group) => {
        const input: UpdateGroupMembershipCommandInput = {
          profileId: `test-profile-${group}`,
          targetUserPoolGroup: group,
        };

        const result = profileApiModule.updateGroupMembership.updateGroupMembershipCommand(input);

        expect(result.command).toBeInstanceOf(UpdateGroupMembershipCommand);
        expect(result.command.input.targetUserPoolGroup).toBe(group);
        expect(result.command.input.profileId).toBe(`test-profile-${group}`);
      });
    });

    it('should maintain input structure integrity', () => {
      const input: UpdateGroupMembershipCommandInput = {
        profileId: 'integrity-test-profile',
        targetUserPoolGroup: UserGroups.ADMIN,
      };

      const result = profileApiModule.updateGroupMembership.updateGroupMembershipCommand(input);

      expect(input.profileId).toBe('integrity-test-profile');
      expect(input.targetUserPoolGroup).toBe(UserGroups.ADMIN);

      expect(result.command.input).toEqual(input);
      expect(result.command.input.profileId).toBe('integrity-test-profile');
      expect(result.command.input.targetUserPoolGroup).toBe(UserGroups.ADMIN);
    });
  });
});
