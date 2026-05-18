import {
  TextractClient,
  DetectDocumentTextCommand,
  Block,
} from "@aws-sdk/client-textract";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import type { S3Event } from "aws-lambda";

const textract = new TextractClient({ region: process.env.AWS_REGION });
const lambda = new LambdaClient({ region: process.env.AWS_REGION });

const PARSER_FUNCTION = process.env.PARSER_FUNCTION_NAME!;

interface ParserPayload {
  receiptId: string;
  s3Key: string;
  rawText: string;
}

export const handler = async (event: S3Event): Promise<void> => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;

    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    if (!key.startsWith("receipts/")) {
      console.log(`Skipping non-receipt key: ${key}`);
      continue;
    }

    const keyParts = key.split("/");
    const filename = keyParts[2] ?? "";
    const receiptId = filename.slice(0, 36);

    console.log(`Processing receipt — id: ${receiptId}, key: ${key}`);

    try {
      const textractResult = await textract.send(
        new DetectDocumentTextCommand({
          Document: {
            S3Object: { Bucket: bucket, Name: key },
          },
        })
      );

      const rawText = extractLines(textractResult.Blocks ?? []);
      if (!rawText.trim()) {
        console.error(`Textract returned no text for key: ${key}`);
        continue;
      }

      console.log(`Textract extracted ${rawText.split("\n").length} lines`);

      const payload: ParserPayload = { receiptId, s3Key: key, rawText };
      await lambda.send(
        new InvokeCommand({
          FunctionName: PARSER_FUNCTION,
          InvocationType: "Event",
          Payload: Buffer.from(JSON.stringify(payload)),
        })
      );

      console.log(`Parser invoked for receiptId: ${receiptId}`);

    } catch (err) {
      console.error(`Failed to process key ${key}:`, err);
    }
  }
};

function extractLines(blocks: Block[]): string {
  return blocks
    .filter(
      (b): b is Block & { Text: string } =>
        b.BlockType === "LINE" && typeof b.Text === "string"
    )
    .map((b) => b.Text)
    .join("\n");
}
