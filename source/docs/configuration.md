# Configuration defaults

The versioned canonical defaults are [`libs/config/src/data/defaultConfig.json`](../libs/config/src/data/defaultConfig.json). It declares the expected `$schema` reference and `version: 1`; its companion JSON Schema documents the supported fields. `libs/config/src/defaults/defaultConfig.ts` validates the JSON at runtime without adding a production dependency. Validation errors identify the invalid field path.

The `NAMESPACE` environment variable overrides `common.defaultNamespace` when the DynamoDB table and Cognito user-pool names are derived. Empty or unset values retain the configured default namespace.

`SAGEMAKER_INSTANCE_TYPE`, populated from the CDK `SAGEMAKER_INSTANCE_TYPE` context when configured, is used consistently for both training-job creation and its Service Quotas lookup.

`userPool.enableSignups` controls Cognito self-signup. `userPool.enableMFA` maps to Cognito `OFF` when false; when true it enables optional TOTP MFA only (SMS remains disabled).
