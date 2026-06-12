import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";

export interface HttpApiConstructProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  uploadLambda: lambda.Function;
  receiptLambda: lambda.Function;
}
