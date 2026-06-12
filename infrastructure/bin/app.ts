#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ApiStack, FoundationStack, DatabaseStack } from '../lib/stacks';

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-2',
};

const foundation = new FoundationStack(app, 'ReceiptSystemFoundation', { env });

const database = new DatabaseStack(app, 'ReceiptSystemDatabase', { env });

const api = new ApiStack(app, 'ReceiptSystemApi', {
  env,
  userPool: foundation.userPool,
  userPoolClient: foundation.userPoolClient,
  receiptsBucket: foundation.receiptsBucket,
  dbSecret: database.dbSecret,
  dbInstance: database.dbInstance,
  lambdaSecurityGroup: database.lambdaSecurityGroup
});

// Deploy order
database.addDependency(foundation);
