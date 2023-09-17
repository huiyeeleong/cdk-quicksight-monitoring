import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as athena from 'aws-cdk-lib/aws-athena';


export class CdkQuicksighStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an Athena named query to create a database
    new athena.CfnNamedQuery(this, 'CreateDatabase', {
        database: 'default',
        queryString: `CREATE DATABASE IF NOT EXISTS cdk_cloudwatch_logs;`,
        name: 'CreateDatabase',
      });

    // Define your CloudWatch logs schema
    const logSchema = `
      timestamp string,
      message string,
      // Add other fields based on your log format
    `;

    // Create an Athena named query to create an external table
    new athena.CfnNamedQuery(this, 'CreateExternalTable', {
        database: 'cdk_cloudwatch_logs',
        queryString: `
          CREATE EXTERNAL TABLE IF NOT EXISTS cdk_cloudwatch_logs.your_table_name (
            ${logSchema}
          )
          ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
          LOCATION 's3://cdk-athena-cw-logs-1709/path/';
        `,
        name: 'CreateExternalTable',
      });
    }
}