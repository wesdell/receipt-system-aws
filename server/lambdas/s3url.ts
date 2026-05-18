import { randomUUID } from "crypto";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const s3 = new S3Client({ region: process.env.AWS_REGION });

const RECEIPTS_BUCKET = process.env.RECEIPTS_BUCKET!;
const PRESIGNED_URL_TTL = 300;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json",
};

interface UploadRequest {
  filename: string;
  contentType: string;
}

interface UploadResponse {
  uploadUrl: string;
  receiptId: string;
  key: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body ?? "{}") as Partial<UploadRequest>;

    if (!body.filename || !body.contentType) {
      return respond(400, { error: "filename and contentType are required" });
    }

    const receiptId = randomUUID();

    const yearMonth = new Date().toISOString().slice(0, 7); // "2026-04"
    const safeFilename = body.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `receipts/${yearMonth}/${receiptId}-${safeFilename}`;

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: RECEIPTS_BUCKET,
        Key: key,
        ContentType: body.contentType,
        Tagging: `receiptId=${receiptId}`,
      }),
      { expiresIn: PRESIGNED_URL_TTL }
    );

    const responseBody: UploadResponse = { uploadUrl, receiptId, key };
    return respond(200, responseBody);

  } catch (err) {
    console.error("s3url error:", err);
    return respond(500, { error: "Failed to generate upload URL" });
  }
};

function respond(statusCode: number, body: object): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS,
    body: JSON.stringify(body),
  };
}
