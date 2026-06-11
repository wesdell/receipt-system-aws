import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, "DefaultVps", {
      isDefault: true
    });

    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, "LambdaSecurityGroup", {
      securityGroupName: "w-rs-lambda-sg",
      description: "Attached to all w-rs lambda funcitons",
      vpc,
      allowAllOutbound: true
    });

    const dbSecurityGorup = new ec2.SecurityGroup(this, "DBSecurityGroup", {
      securityGroupName: "w-rs-db-sg",
      description: "Control access to the Aurora cluster",
      vpc,
      allowAllOutbound: false
    });

    dbSecurityGorup.addIngressRule(
      ec2.Peer.securityGroupId(this.lambdaSecurityGroup.securityGroupId),
      ec2.Port.tcp(5432),
      "Allow calls to PostgreSQL from lambda functions only"
    );

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

    this.dbInstance = new rds.DatabaseInstance(this, "PostgresInstance", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),

      instanceIdentifier: "w-rs-db-instance",
      credentials: rds.Credentials.fromSecret(this.dbSecret),

      allocatedStorage: 20,
      publiclyAccessible: false,

      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },

      securityGroups: [dbSecurityGorup],
      databaseName: "receiptsdb",

      storageEncrypted: true,

      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deleteAutomatedBackups: true
    });

    // Outputs
    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.dbSecret.secretArn,
      description: 'ARN of the Secrets Manager secret holding DB credentials',
      exportName: 'ReceiptSystem-DbSecretArn',
    });

    new cdk.CfnOutput(this, 'DbInstanceEndpoint', {
      value: this.dbInstance.instanceEndpoint.hostname,
      description: 'PostgreSQL endpoint hostname',
      exportName: 'ReceiptSystem-DbInstanceEndpoint',
    });

    new cdk.CfnOutput(this, 'LambdaSecurityGroupId', {
      value: this.lambdaSecurityGroup.securityGroupId,
      description: 'Security group ID to attach to Lambda functions',
      exportName: 'ReceiptSystem-LambdaSecurityGroupId',
    });
  }
}
