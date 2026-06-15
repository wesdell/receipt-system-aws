import * as path from "path";

import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

import { ReceiptApiLambdaProps } from "../../interfaces";

export class ReceiptApiLambda extends Construct {
  public readonly fn: lambda.Function;

  constructor(
    scope: Construct,
    id: string,
    props: ReceiptApiLambdaProps
  ) {
    super(scope, id);

    const role = new iam.Role(this, "Role", {
      assumedBy: new iam.ServicePrincipal(
        "lambda.amazonaws.com"
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaVPCAccessExecutionRole"
        )
      ]
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "secretsmanager:GetSecretValue"
        ],
        resources: [
          props.dbSecret.secretArn
        ]
      })
    );

    this.fn = new nodejs.NodejsFunction(
      this,
      "Function",
      {
        functionName:
          "w-rs-fn-receipt-api",

        entry: path.join(__dirname, "../../lambdas/api-receipts.ts"),

        runtime:
          lambda.Runtime.NODEJS_20_X,

        role,

        vpc: props.vpc,
        allowPublicSubnet: true,
        timeout: cdk.Duration.seconds(30),

        securityGroups: [
          props.securityGroup
        ],

        environment: {
          DB_SECRET_ARN:
            props.dbSecret.secretArn,

          DB_HOST:
            props.dbInstance
              .instanceEndpoint.hostname,

          DB_PORT: "5432",

          DB_NAME: "receiptsdb"
        }
      }
    );
  }
}
