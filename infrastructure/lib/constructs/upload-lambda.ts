import * as path from "path";

import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

import { UploadLambdaProps } from "../../interfaces";

export class UploadLambda extends Construct {
  public readonly fn: lambda.Function;

  constructor(
    scope: Construct,
    id: string,
    props: UploadLambdaProps
  ) {
    super(scope, id);

    const role = new iam.Role(this, "Role", {
      assumedBy: new iam.ServicePrincipal(
        "lambda.amazonaws.com"
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        )
      ]
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject"],
        resources: [
          `${props.bucket.bucketArn}/users/*`
        ]
      })
    );

    this.fn = new nodejs.NodejsFunction(
      this,
      "Function",
      {
        functionName: "w-rs-fn-upload-url",
        entry: path.join(__dirname, "../../lambdas/upload-url.ts"),
        runtime:
          lambda.Runtime.NODEJS_20_X,
        role,
        environment: {
          RECEIPTS_BUCKET:
            props.bucket.bucketName
        }
      }
    );
  }
}
