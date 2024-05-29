import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class JawsugKanazawaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const lambdafunc = new NodejsFunction(this, "NodeJsLambdaFunction", {
      entry: './lib/lambda.ts',
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
    });

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'JawsugKanazawaCdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
