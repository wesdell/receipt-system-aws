import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const MODEL_ID = "anthropic.claude-sonnet-4-5";
const TABLE = process.env.RECEIPTS_TABLE!;

const USER_ID = process.env.USER_ID ?? "default";

interface ParserInput {
  receiptId: string;
  s3Key: string;
  rawText: string;
}

interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

interface ExtractedReceipt {
  date: string | null;
  store: string | null;
  city: string | null;
  category: string;
  paymentMethod: string;
  currency: string;
  total: number | null;
  tax: number | null;
  subtotal: number | null;
  items: ReceiptItem[];
}

export const handler = async (event: ParserInput): Promise<void> => {
  const { receiptId, s3Key, rawText } = event;

  console.log(`Parsing receipt: ${receiptId}`);

  const extracted = await extractWithBedrock(rawText);

  console.log(`Extracted:`, JSON.stringify(extracted, null, 2));

  const now = new Date().toISOString();
  const date = extracted.date ?? now.slice(0, 10);
  const category = extracted.category ?? "other";

  const categoryDate = `${category}#${date}`;
  const yearMonth = date.slice(0, 7);

  const item = {
    userId,
    receiptId,
    date,
    categoryDate,

    yearMonth,
    store: extracted.store ?? "Unknown store",
    city: extracted.city ?? null,
    category,
    paymentMethod: extracted.paymentMethod ?? "unknown",
    currency: extracted.currency ?? "USD",

    total: extracted.total ?? null,
    tax: extracted.tax ?? null,
    subtotal: extracted.subtotal ?? null,
    items: extracted.items ?? [],

    rawS3Key: s3Key,
    status: "processed",
    source: "upload",
    uploadedAt: now,
    updatedAt: now,
  };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

  console.log(`Saved receipt ${receiptId} to DynamoDB`);
};

async function extractWithBedrock(rawText: string): Promise<ExtractedReceipt> {
  const prompt = buildPrompt(rawText);

  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    })
  );

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const rawJson = responseBody.content?.[0]?.text ?? "{}";

  const cleaned = rawJson.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned) as ExtractedReceipt;
  } catch {
    console.error("Failed to parse Bedrock response:", rawJson);
    return {
      date: null,
      store: null,
      city: null,
      category: "other",
      paymentMethod: "unknown",
      currency: "USD",
      total: null,
      tax: null,
      subtotal: null,
      items: [],
    };
  }
}

function buildPrompt(rawText: string): string {
  return `You are a receipt data extraction assistant. Extract structured information from the following receipt OCR text and return ONLY a valid JSON object — no explanation, no markdown, no extra text.

Required JSON structure:
{
  "date": "YYYY-MM-DD or null if not found",
  "store": "store or business name, or null",
  "city": "city name, or null",
  "category": "one of: food, bakery, pharmacy, technology, clothing, transport, entertainment, restaurant, supermarket, other",
  "paymentMethod": "card, cash, transfer, or unknown",
  "currency": "ISO currency code e.g. USD, EUR, or USD if unclear",
  "total": number or null,
  "tax": number or null,
  "subtotal": number or null,
  "items": [
    { "name": "item name", "qty": number, "price": number }
  ]
}

Rules:
- All monetary values must be numbers (not strings).
- If a field cannot be determined, use null (not empty string).
- For category, infer from the store name and items if not explicit.
- For paymentMethod: TC/tarjeta/card → "card", efectivo/cash → "cash".
- Items array can be empty [] if individual items are not listed.
- Return ONLY the JSON object, nothing else.

Receipt OCR text:
---
${rawText}
---`;
}

const userId = USER_ID;
