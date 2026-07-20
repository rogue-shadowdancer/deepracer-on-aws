// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import defaultConfigJson from '#data/defaultConfig.json';
import { SUPPORTED_TRAINING_INSTANCE_TYPES, SupportedTrainingInstanceType } from '#types/sageMakerConfig.js';

export interface DefaultConfig {
  $schema: './defaultConfig.schema.json';
  version: 1;
  common: {
    defaultNamespace: string;
    minEvaluationTrials: number;
  };
  dynamoDB: {
    baseTableName: string;
    resourceIdLength: number;
  };
  sageMaker: {
    instanceCount: number;
    instanceType: SupportedTrainingInstanceType;
    instanceVolumeSizeInGB: number;
  };
  userPool: {
    baseName: string;
    enableMFA: boolean;
    enableSignups: boolean;
  };
}

function invalid(path: string, message: string): never {
  throw new Error(`Invalid default configuration at "${path}": ${message}`);
}

function objectAt(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(path, 'expected an object');
  }

  return value as Record<string, unknown>;
}

function hasOnlyKeys(value: Record<string, unknown>, path: string, keys: readonly string[]) {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      invalid(`${path}.${key}`, 'is not allowed');
    }
  }
}

function stringAt(value: Record<string, unknown>, key: string, path: string, pattern?: RegExp): string {
  const fieldPath = `${path}.${key}`;
  const field = value[key];
  if (typeof field !== 'string' || field.length === 0) {
    invalid(fieldPath, 'expected a non-empty string');
  }
  if (pattern && !pattern.test(field)) {
    invalid(fieldPath, `expected a value matching ${pattern}`);
  }
  return field;
}

function enumStringAt<T extends string>(
  value: Record<string, unknown>,
  key: string,
  path: string,
  supportedValues: readonly T[],
): T {
  const fieldPath = `${path}.${key}`;
  const field = stringAt(value, key, path);
  if (!supportedValues.includes(field as T)) {
    invalid(fieldPath, `unsupported value ${JSON.stringify(field)}`);
  }
  return field as T;
}

function integerAt(
  value: Record<string, unknown>,
  key: string,
  path: string,
  minimum: number,
  maximum: number,
): number {
  const fieldPath = `${path}.${key}`;
  const field = value[key];
  if (typeof field !== 'number' || !Number.isInteger(field) || field < minimum || field > maximum) {
    invalid(fieldPath, `expected an integer from ${minimum} through ${maximum}`);
  }
  return field;
}

function literalAt<T extends string | number>(
  value: Record<string, unknown>,
  key: string,
  path: string,
  expected: T,
): T {
  const fieldPath = `${path}.${key}`;
  if (value[key] !== expected) {
    invalid(fieldPath, `expected ${JSON.stringify(expected)}`);
  }
  return expected;
}

function booleanAt(value: Record<string, unknown>, key: string, path: string): boolean {
  const fieldPath = `${path}.${key}`;
  const field = value[key];
  if (typeof field !== 'boolean') {
    invalid(fieldPath, 'expected a boolean');
  }
  return field;
}

/**
 * Validates the checked-in default configuration without a runtime schema dependency.
 * Error messages identify the invalid JSON field so deployment failures are actionable.
 */
export function validateDefaultConfig(value: unknown): DefaultConfig {
  const root = objectAt(value, 'root');
  hasOnlyKeys(root, 'root', ['$schema', 'version', 'common', 'dynamoDB', 'sageMaker', 'userPool']);

  const common = objectAt(root.common, 'common');
  hasOnlyKeys(common, 'common', ['defaultNamespace', 'minEvaluationTrials']);
  const dynamoDB = objectAt(root.dynamoDB, 'dynamoDB');
  hasOnlyKeys(dynamoDB, 'dynamoDB', ['baseTableName', 'resourceIdLength']);
  const sageMaker = objectAt(root.sageMaker, 'sageMaker');
  hasOnlyKeys(sageMaker, 'sageMaker', ['instanceCount', 'instanceType', 'instanceVolumeSizeInGB']);
  const userPool = objectAt(root.userPool, 'userPool');
  hasOnlyKeys(userPool, 'userPool', ['baseName', 'enableMFA', 'enableSignups']);

  return {
    $schema: literalAt(root, '$schema', 'root', './defaultConfig.schema.json'),
    version: literalAt(root, 'version', 'root', 1),
    common: {
      defaultNamespace: stringAt(common, 'defaultNamespace', 'common', /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/),
      minEvaluationTrials: integerAt(common, 'minEvaluationTrials', 'common', 1, 1000),
    },
    dynamoDB: {
      baseTableName: stringAt(dynamoDB, 'baseTableName', 'dynamoDB', /^[A-Za-z0-9_.-]{3,255}$/),
      resourceIdLength: integerAt(dynamoDB, 'resourceIdLength', 'dynamoDB', 1, 255),
    },
    sageMaker: {
      instanceCount: integerAt(sageMaker, 'instanceCount', 'sageMaker', 1, 100),
      instanceType: enumStringAt(sageMaker, 'instanceType', 'sageMaker', SUPPORTED_TRAINING_INSTANCE_TYPES),
      instanceVolumeSizeInGB: integerAt(sageMaker, 'instanceVolumeSizeInGB', 'sageMaker', 1, 16384),
    },
    userPool: {
      baseName: stringAt(userPool, 'baseName', 'userPool', /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/),
      enableMFA: booleanAt(userPool, 'enableMFA', 'userPool'),
      enableSignups: booleanAt(userPool, 'enableSignups', 'userPool'),
    },
  };
}

export const defaultConfig = validateDefaultConfig(defaultConfigJson);
