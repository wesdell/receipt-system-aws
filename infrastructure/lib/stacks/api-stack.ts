import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
interface ApiStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  receiptsBucket: s3.Bucket;
  dbSecret: secretsmanager.ISecret;
  dbInstance: rds.DatabaseInstance;
  lambdaSecurityGroup: ec2.SecurityGroup;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Avoid TS "unused variables" error
    void props.userPool;
    void props.userPoolClient;
    void props.receiptsBucket;
    void props.dbSecret;
    void props.dbInstance;
    void props.lambdaSecurityGroup;
  }
}
