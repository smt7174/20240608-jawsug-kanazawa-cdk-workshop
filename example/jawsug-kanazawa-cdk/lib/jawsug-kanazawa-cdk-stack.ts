import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { TableV2, AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { RestApi, LambdaIntegration, Integration, IntegrationType } from "aws-cdk-lib/aws-apigateway";
import { Role, Effect, ServicePrincipal, PolicyStatement, PolicyDocument, Policy, ManagedPolicy } from "aws-cdk-lib/aws-iam";

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
        stageName: 'test2'
      }
    });
    
    // 今回は2行に分けましたが、もちろんメソッドチェーンを利用し1行で書いてもOKです。
    const apiGwResource = apiGw.root.addResource('jawsug');
    apiGwResource.addMethod('POST', new LambdaIntegration(lambdaFunc));
    
    // Lambdaなしの例
    const noLambdaResource = apiGw.root.addResource('nolambda');
    noLambdaResource.addMethod('POST', new Integration({
      type: IntegrationType.AWS,
      integrationHttpMethod: 'POST',
      uri: 'arn:aws:apigateway:ap-northeast-1:dynamodb:action/GetItem',
      options: {
        credentialsRole: new Role(this, 'NoLambdaResourceRole', {
          assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
          roleName: 'RoleForNoLambdaResource',
          managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBReadOnlyAccess')],
        }),
        requestTemplates: {
          'application/json': JSON.stringify({
            TableName: dynamoDbTable.tableName,
            Key: {
              region: { S: 'hokuriku' },
              code: { N: "$input.path('$.code')" }
            }
          })
        },
        integrationResponses: [{
          statusCode: '200',
          responseTemplates: {
            'application/json': "JSON.stringify({ Items: $input.json('$') })",
          },
          // responseParameters: {
          //   'method.response.header.Access-Control-Allow-Origin': "'*'",
          // },
        }],
      }
    }));
    
    
    // FYI: これ以降のコードは個人的な検証で利用したものです。
    // 今回のワークショップでは不要です。
    const inlinePolicy = new PolicyDocument({
      statements: [new PolicyStatement({
        actions: ['dynamodb:Scan'],
        effect: Effect.ALLOW,
        resources: ['*']
      })]
    });

    const policy = new PolicyStatement({
      actions: ['dynamodb:Query'],
      effect: Effect.ALLOW,
      resources: ['*']
    });
    
    const principalPolicy = new PolicyStatement({
      actions: ['dynamodb:GetItem'],
      effect: Effect.ALLOW,
      resources: ['*']
    });
    
    const attachInlinePolicyDocument = new PolicyDocument({
      statements: [new PolicyStatement({
        actions: ['dynamodb:DescribeTable'],
        effect: Effect.ALLOW,
        resources: ['*'],
      })]
    });
    
    const attachInlinePolicy = new Policy(this, 'RoleAttachInlinePolicyId', {
      document: attachInlinePolicyDocument,
      policyName: 'RoleAttachInlinePolicy',
    });
    
    const role = new Role(this, 'LambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'RoleForPolicyAttachmentTest',
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBReadOnlyAccess')],
      inlinePolicies: {
        'RolePropsInitialPolicy': inlinePolicy,
      },
    });
    
    role.addToPolicy(policy);
    role.addToPrincipalPolicy(principalPolicy);
    role.attachInlinePolicy(attachInlinePolicy);
  }
}
