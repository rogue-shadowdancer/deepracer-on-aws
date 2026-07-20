// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { defaultConfig } from './defaultConfig.js';

/** Default namespace for all resources when none is specified. */
export const DEFAULT_NAMESPACE = defaultConfig.common.defaultNamespace;

/** Default number of evaluation trials per training iteration. */
export const DEFAULT_MIN_EVAL_TRIALS = defaultConfig.common.minEvaluationTrials;
