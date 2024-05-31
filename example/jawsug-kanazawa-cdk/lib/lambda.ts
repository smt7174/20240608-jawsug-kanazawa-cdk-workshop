import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, APIGatewayProxyResult, Context } from "aws-lambda";

export const handler = async (event: APIGatewayEvent, context: Context ): Promise<APIGatewayProxyResult> => {  
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  
  const command = new ScanCommand({
    TableName: process.env.TABLE_NAME,
  });

  const response = await docClient.send(command);
  
  const result: APIGatewayProxyResult = {
    statusCode: 200,
    headers: {
      contentType: 'application/json',
    },
    body: JSON.stringify(response.Items),
  };
  
  return result;
};