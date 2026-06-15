import {
  SecretsManagerClient,
  GetSecretValueCommand
} from "@aws-sdk/client-secrets-manager";

import { Client } from "pg";

export const handler = async () => {
  try {
    const secretsClient =
      new SecretsManagerClient({});

    const secretArn =
      process.env.DB_SECRET_ARN!;

    const secretResponse =
      await secretsClient.send(
        new GetSecretValueCommand({
          SecretId: secretArn
        })
      );

    if (!secretResponse.SecretString) {
      throw new Error(
        "Secret string not found"
      );
    }

    const credentials = JSON.parse(
      secretResponse.SecretString
    );

    const client = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,

      user: credentials.username,
      password: credentials.password,

      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();

    const result =
      await client.query(
        "SELECT 1 AS connected"
      );

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({
        database: "connected",
        result: result.rows[0]
      })
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unknown error"
      })
    };
  }
};
