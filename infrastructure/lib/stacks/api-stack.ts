import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { ApiStackProps } from "../../interfaces";
import { HttpApiConstruct, ReceiptApiLambda, UploadLambda } from "../constructs";

export class ApiStack extends cdk.Stack {
  public readonly apiURL: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const uploadLambda = new UploadLambda(this, "UploadLambdaURL", {
      bucket: props.receiptsBucket
    });

    const receiptLambda = new ReceiptApiLambda(this, "ReceiptAPILambda", {
      dbSecret: props.dbSecret,
      dbInstance: props.dbInstance,
      securityGroup: props.lambdaSecurityGroup,
      vpc: props.vpc
    });

    const api = new HttpApiConstruct(this, "HttpApi", {
      userPool: props.userPool,
      userPoolClient: props.userPoolClient,
      uploadLambda: uploadLambda.fn,
      receiptLambda: receiptLambda.fn
    });

    this.apiURL = api.apiUrl;

    //Outputs
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.apiUrl,
      description: "HTTP API URL",
      exportName: "ReceiptSystem-ApiUrl",
    });

  }
}
