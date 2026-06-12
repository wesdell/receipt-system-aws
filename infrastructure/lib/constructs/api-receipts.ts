import * as ec2 from "aws-cdk-lib/aws-ec2";
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

    const vpc = ec2.Vpc.fromLookup(this, "DefaultVpc", {
      isDefault: true
    });

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

        entry:
          "../../lambdas/api-receipts.ts",

        runtime:
          lambda.Runtime.NODEJS_20_X,

        role,

        vpc,

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
