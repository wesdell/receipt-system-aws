import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { Construct } from "constructs";

import { HttpApiConstructProps } from "../../interfaces";

export class HttpApiConstruct extends Construct {
  public readonly apiUrl: string;

  constructor(
    scope: Construct,
    id: string,
    props: HttpApiConstructProps
  ) {
    super(scope, id);

    const api = new apigatewayv2.HttpApi(
      this,
      "HttpApi",
      {
        apiName: "w-rs-api",

        corsPreflight: {
          allowOrigins: [
            "http://localhost:5173"
          ],

          allowMethods: [
            apigatewayv2.CorsHttpMethod.ANY
          ],

          allowHeaders: [
            "Authorization",
            "Content-Type"
          ]
        }
      }
    );

    const authorizer =
      new authorizers.HttpJwtAuthorizer(
        "CognitoAuthorizer",
        `https://cognito-idp.${cdk.Stack.of(this).region}.amazonaws.com/${props.userPool.userPoolId}`,
        {
          jwtAudience: [
            props.userPoolClient.userPoolClientId
          ]
        }
      );

    api.addRoutes({
      path: "/upload-url",
      methods: [
        apigatewayv2.HttpMethod.POST
      ],
      integration:
        new integrations.HttpLambdaIntegration(
          "UploadIntegration",
          props.uploadLambda
        ),
      authorizer
    });

    api.addRoutes({
      path: "/receipts",
      methods: [
        apigatewayv2.HttpMethod.GET
      ],
      integration:
        new integrations.HttpLambdaIntegration(
          "ReceiptIntegration",
          props.receiptLambda
        ),
      authorizer
    });

    this.apiUrl = api.url!;
  }
}
