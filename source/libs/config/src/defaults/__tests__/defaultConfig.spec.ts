// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest';

import defaultConfigJson from '#data/defaultConfig.json';
import defaultConfigSchema from '#data/defaultConfig.schema.json';
import { SUPPORTED_TRAINING_INSTANCE_TYPES } from '#types/sageMakerConfig.js';

import { validateDefaultConfig } from '../defaultConfig.js';

describe('default configuration', () => {
  afterEach(() => {
    delete process.env.NAMESPACE;
    vi.resetModules();
  });

  it('validates the checked-in canonical JSON defaults', () => {
    expect(validateDefaultConfig(defaultConfigJson)).toEqual(defaultConfigJson);
  });

  it('reports the full field path for invalid values', () => {
    expect(() =>
      validateDefaultConfig({
        ...defaultConfigJson,
        sageMaker: { ...defaultConfigJson.sageMaker, instanceType: 'c7i.4xlarge' },
      }),
    ).toThrow('sageMaker.instanceType');
  });

  it('rejects well-shaped instance types without a quota mapping', () => {
    expect(() =>
      validateDefaultConfig({
        ...defaultConfigJson,
        sageMaker: { ...defaultConfigJson.sageMaker, instanceType: 'ml.m7i.2xlarge' },
      }),
    ).toThrow('sageMaker.instanceType');
  });

  it('accepts a supported mapped instance type', () => {
    expect(
      validateDefaultConfig({
        ...defaultConfigJson,
        sageMaker: { ...defaultConfigJson.sageMaker, instanceType: 'ml.g4dn.2xlarge' },
      }).sageMaker.instanceType,
    ).toBe('ml.g4dn.2xlarge');
  });

  it('keeps the JSON schema instance enum aligned with runtime validation', () => {
    expect(defaultConfigSchema.properties.sageMaker.properties.instanceType.enum).toEqual(
      SUPPORTED_TRAINING_INSTANCE_TYPES,
    );
  });

  it('rejects missing fields and unknown fields', () => {
    const { common: _common, ...withoutCommon } = defaultConfigJson;
    expect(() => validateDefaultConfig(withoutCommon)).toThrow('common');
    expect(() => validateDefaultConfig({ ...defaultConfigJson, unexpected: true })).toThrow('root.unexpected');
    expect(() =>
      validateDefaultConfig({
        ...defaultConfigJson,
        dynamoDB: { ...defaultConfigJson.dynamoDB, unexpected: true },
      }),
    ).toThrow('dynamoDB.unexpected');
  });

  it('rejects invalid integer ranges and resource names', () => {
    expect(() =>
      validateDefaultConfig({
        ...defaultConfigJson,
        common: { ...defaultConfigJson.common, minEvaluationTrials: 0 },
      }),
    ).toThrow('common.minEvaluationTrials');
    expect(() =>
      validateDefaultConfig({
        ...defaultConfigJson,
        sageMaker: { ...defaultConfigJson.sageMaker, instanceVolumeSizeInGB: 16385 },
      }),
    ).toThrow('sageMaker.instanceVolumeSizeInGB');
    expect(() =>
      validateDefaultConfig({
        ...defaultConfigJson,
        common: { ...defaultConfigJson.common, defaultNamespace: 'invalid namespace' },
      }),
    ).toThrow('common.defaultNamespace');
    expect(() =>
      validateDefaultConfig({
        ...defaultConfigJson,
        userPool: { ...defaultConfigJson.userPool, baseName: 'invalid name' },
      }),
    ).toThrow('userPool.baseName');
  });

  it('requires the supported schema reference and configuration version', () => {
    expect(() => validateDefaultConfig({ ...defaultConfigJson, $schema: 'other.schema.json' })).toThrow('root.$schema');
    expect(() => validateDefaultConfig({ ...defaultConfigJson, version: 2 })).toThrow('root.version');
    const { version: _version, ...withoutVersion } = defaultConfigJson;
    expect(() => validateDefaultConfig(withoutVersion)).toThrow('root.version');
  });

  it('derives resource names from the NAMESPACE override', async () => {
    process.env.NAMESPACE = 'classroom';

    const { dynamoDBDefaults } = await import('../dynamoDBDefaults.js');
    const { userPoolDefaults } = await import('../userPoolDefaults.js');

    expect(dynamoDBDefaults.tableName).toBe('classroom-DeepRacerIndy.Main');
    expect(userPoolDefaults.userPoolName).toBe('classroom-DeepRacerIndyUserPool');
  });
});
