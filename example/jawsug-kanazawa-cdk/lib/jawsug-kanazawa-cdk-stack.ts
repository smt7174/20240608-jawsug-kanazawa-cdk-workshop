import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { TableV2, AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { RestApi, LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
// import { Role, Effect, ServicePrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";

export class JawsugKanazawaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const dynamoDbTable = new TableV2(this, 'DynamoDbTableV2', {
      tableName: 'JawsugKanazawaDynamoDbTableV2',
      partitionKey: {
        name: 'region',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'code',
        type: AttributeType.NUMBER
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // const role = new Role(this, 'LambdaRole', {
    //   assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    //   roleName: 'JawsugKanazawaLambdaRole',
    // });
    
    // role.addToPrincipalPolicy(new PolicyStatement({
    //   actions: ['dynamodb:Scan'],
    //   effect: Effect.ALLOW,
    //   resources: [dynamoDbTable.tableArn],
    // }));
    
    const lambdaFunc = new NodejsFunction(this, "NodeJsLambdaFunction", {
      entry: './lib/lambda.ts',
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      functionName: 'JawsugKanazawaNodeJsLambdaFunction',
      environment: {
        TABLE_NAME: dynamoDbTable.tableName,
      },
      // role,
    });
    lambdaFunc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    
    dynamoDbTable.grantReadData(lambdaFunc);
    
    const apiGw = new RestApi(this, 'ApiGatewayRestApi', {
      restApiName: 'JawsugKanazawaRestApi',
      deployOptions: {
        // stageNameは省略した場合「prod」になります。
        stageName: 'test'
      }
    });
    
    // 今回は2行に分けましたが、もちろんメソッドチェーンを利用し1行で書いてもOKです。
    const apiGwResource = apiGw.root.addResource('jawsug');
    apiGwResource.addMethod('GET', new LambdaIntegration(lambdaFunc));
  }
}
