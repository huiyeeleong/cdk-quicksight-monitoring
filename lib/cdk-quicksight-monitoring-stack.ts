import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';


export class CdkQuicksightMonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the Lambda function
    const randomReportingLambda = new lambda.Function(this, 'randomReporting', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'random_reporting.lambda_handler',
      code: lambda.Code.fromAsset('app/random_reporting'),
      timeout: cdk.Duration.minutes(1),
    });

    // Define the SQS queue
    const queue = new sqs.Queue(this, 'randomdataqueue', {
      visibilityTimeout: cdk.Duration.seconds(65),
      queueName: 'randomdataqueue',
    });

    // Define a role with necessary permissions
    const role = new iam.Role(this, 'ApiGatewaySqsLambdaRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });
    
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonAPIGatewayAdministrator'));
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess'));
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess'));

    // Define the API Gateway without a default integration
    const api = new apigateway.RestApi(this, 'Endpoint');

    // Create a new API Gateway resource for '/randomdata'
    const randomDataResource = api.root.addResource('randomdata');

    // Set up the SQS integration
    const sqsIntegration = new apigateway.AwsIntegration({
      service: 'sqs',
      path: `${cdk.Stack.of(this).account}/${queue.queueName}`,
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: role,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
            },
            responseTemplates: {
              'application/json': '',
            },
          },
        ],
        requestParameters: {
          'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'",
        },
        requestTemplates: {
          'application/json': 'Action=SendMessage&MessageBody=$input.body',
        },
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
      },
    });

    // Create an empty model
    const emptyModel = new apigateway.Model(this, 'EmptyModel', {
      restApi: api,
      contentType: 'application/json',
      modelName: 'EmptyModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'emptyModel',
        type: apigateway.JsonSchemaType.OBJECT,
      },
    });

    // Add POST method to '/randomdata' with the SQS integration
    randomDataResource.addMethod('POST', sqsIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': emptyModel,
          },
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
        },
      ],
    });

    // Create a MockIntegration for the OPTIONS method
    const mockIntegration = new apigateway.MockIntegration({
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Credentials': "'false'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
          },
        },
      ],
      passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
      requestTemplates: {
        "application/json": "{ \"statusCode\": 200 }",
      },
    });

    // Add OPTIONS method to '/randomdata' resource with the MockIntegration
    randomDataResource.addMethod('OPTIONS', mockIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': emptyModel,
          },
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Credentials': true,
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    // Define a new Lambda function to consume messages from the SQS queue
    const sqsConsumerLambda = new lambda.Function(this, 'SQSConsumerLambda', {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'sqs_consumer.lambda_handler',
      code: lambda.Code.fromAsset('app/sqs_consumer'), 
      timeout: cdk.Duration.seconds(60), // Setting a timeout of 1 minute
    });

    // Grant the necessary permissions for the Lambda function to access the SQS queue
    queue.grantConsumeMessages(sqsConsumerLambda);

    // Set up the SQS event source for the Lambda function
    sqsConsumerLambda.addEventSource(new lambdaEventSources.SqsEventSource(queue));

    // Define a new DynamoDB table with 'userid' as the partition key
    const acnDbUser = new dynamodb.Table(this, 'acn_db_user', {
      tableName: 'acn_db_user',
      partitionKey: { name: 'userid', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Setting billing mode to pay per request
    });

    // Grant the Lambda function permissions to read and write data to the DynamoDB table
    acnDbUser.grantReadWriteData(sqsConsumerLambda);


  }
}