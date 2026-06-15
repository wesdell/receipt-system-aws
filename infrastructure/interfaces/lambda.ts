import * as s3 from "aws-cdk-lib/aws-s3";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

export interface UploadLambdaProps {
  bucket: s3.Bucket;
  securityGroup: ec2.SecurityGroup;
  vpc: ec2.IVpc;
}

export interface ReceiptApiLambdaProps {
  dbSecret: secretsmanager.ISecret;
  dbInstance: rds.DatabaseInstance;
  securityGroup: ec2.SecurityGroup;
  vpc: ec2.IVpc;
}