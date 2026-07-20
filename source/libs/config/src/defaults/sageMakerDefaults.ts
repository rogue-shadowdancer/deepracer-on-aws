// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import type { DeepRacerIndySageMakerConfig } from '#types/sageMakerConfig.js';

import { defaultConfig } from './defaultConfig.js';

export const sageMakerDefaults: DeepRacerIndySageMakerConfig = {
  instanceCount: defaultConfig.sageMaker.instanceCount,
  instanceType: defaultConfig.sageMaker.instanceType as DeepRacerIndySageMakerConfig['instanceType'],
  instanceVolumeSizeInGB: defaultConfig.sageMaker.instanceVolumeSizeInGB,
};
