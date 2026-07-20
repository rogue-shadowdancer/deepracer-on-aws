// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import type { DeepRacerIndyUserPoolConfig } from '#types/userPoolConfig.js';

import { DEFAULT_NAMESPACE } from './commonDefaults.js';
import { defaultConfig } from './defaultConfig.js';

export const BASE_USER_POOL_NAME = defaultConfig.userPool.baseName;

const namespace = (typeof process !== 'undefined' && process.env?.NAMESPACE) || DEFAULT_NAMESPACE;

export const userPoolDefaults = {
  userPoolName: `${namespace}-${BASE_USER_POOL_NAME}`,
  enableMFA: defaultConfig.userPool.enableMFA,
  enableSignups: defaultConfig.userPool.enableSignups,
} as const satisfies DeepRacerIndyUserPoolConfig;
