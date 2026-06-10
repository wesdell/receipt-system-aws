import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
  public readonly dbSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.dbSecret = new secretsmanager.Secret(this, "DBSecret", {
      secretName: "w-rs-db-credentials",
      description: "Aurora PostgreSQL DB credentials",

      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "wrsadmin" }),
        generateStringKey: "password",
        excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
        passwordLength: 32
      },

      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
  }
}
