import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE = process.env.RECEIPTS_TABLE!;
const INDEX_DATE = process.env.INDEX_DATE!;
const INDEX_CATEGORY = process.env.INDEX_CATEGORY_DATE!;
const DEFAULT_USER_ID = process.env.USER_ID ?? "default";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json",
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const userId =
    (event.requestContext as any)?.authorizer?.claims?.sub ?? DEFAULT_USER_ID;

  const method = event.httpMethod;
  const path = event.resource;
  const receiptId = event.pathParameters?.id;

  try {
    if (method === "GET" && path === "/receipts") {
      return await listReceipts(userId, event.queryStringParameters ?? {});
    }

    if (method === "GET" && path === "/receipts/{id}" && receiptId) {
      return await getReceipt(userId, receiptId);
    }

    if (method === "PUT" && path === "/receipts/{id}/category" && receiptId) {
      const body = JSON.parse(event.body ?? "{}");
      return await updateCategory(userId, receiptId, body.category);
    }

    if (method === "DELETE" && path === "/receipts/{id}" && receiptId) {
      return await deleteReceipt(userId, receiptId);
    }

    return respond(404, { error: "Route not found" });

  } catch (err) {
    console.error("CRUD error:", err);
    return respond(500, { error: "Internal server error" });
  }
};

async function listReceipts(
  userId: string,
  params: Record<string, string | undefined | null>
): Promise<APIGatewayProxyResult> {
  const { category, from, to } = params;
  const limit = Math.min(parseInt(params.limit ?? "50", 10), 100);

  let queryInput: QueryCommandInput;

  if (category) {
    const fromKey = from ? `${category}#${from}` : `${category}#`;
    const toKey = to ? `${category}#${to}` : `${category}#\uFFFF`;

    queryInput = {
      TableName: TABLE,
      IndexName: INDEX_CATEGORY,
      KeyConditionExpression:
        "userId = :uid AND categoryDate BETWEEN :from AND :to",
      ExpressionAttributeValues: {
        ":uid": userId,
        ":from": fromKey,
        ":to": toKey,
      },
      ScanIndexForward: false,
      Limit: limit,
    };
  } else {
    queryInput = {
      TableName: TABLE,
      IndexName: INDEX_DATE,
      KeyConditionExpression: from || to
        ? "userId = :uid AND #date BETWEEN :from AND :to"
        : "userId = :uid",
      ExpressionAttributeNames: from || to ? { "#date": "date" } : undefined,
      ExpressionAttributeValues: {
        ":uid": userId,
        ...(from ? { ":from": from } : {}),
        ...(to ? { ":to": to } : {}),
      },
      ScanIndexForward: false, // newest first
      Limit: limit,
    };
  }

  const result = await ddb.send(new QueryCommand(queryInput));
  return respond(200, { items: result.Items ?? [], count: result.Count ?? 0 });
}

async function getReceipt(
  userId: string,
  receiptId: string
): Promise<APIGatewayProxyResult> {
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { userId, receiptId },
    })
  );

  if (!result.Item) {
    return respond(404, { error: "Receipt not found" });
  }

  return respond(200, result.Item);
}

async function updateCategory(
  userId: string,
  receiptId: string,
  newCategory: string
): Promise<APIGatewayProxyResult> {
  if (!newCategory) {
    return respond(400, { error: "category is required" });
  }

  const current = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { userId, receiptId } })
  );

  if (!current.Item) {
    return respond(404, { error: "Receipt not found" });
  }

  const date = current.Item.date as string;
  const categoryDate = `${newCategory}#${date}`;

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId, receiptId },
      UpdateExpression:
        "SET category = :cat, categoryDate = :cd, updatedAt = :now",
      ExpressionAttributeValues: {
        ":cat": newCategory,
        ":cd": categoryDate,
        ":now": new Date().toISOString(),
      },
    })
  );

  return respond(200, { receiptId, category: newCategory, categoryDate });
}

async function deleteReceipt(
  userId: string,
  receiptId: string
): Promise<APIGatewayProxyResult> {
  await ddb.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { userId, receiptId },
    })
  );

  return respond(200, { message: "Receipt deleted", receiptId });
}

function respond(statusCode: number, body: object): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS,
    body: JSON.stringify(body),
  };
}
