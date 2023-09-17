import json
import boto3
from botocore.exceptions import NoCredentialsError, PartialCredentialsError

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('acn_db_user') # Replace with your DynamoDB table name

def lambda_handler(event, context):
    for record in event['Records']:
        # Parse the SQS message body
        message_body = json.loads(record['body'])
        
        # Check if message_body is a list and handle accordingly
        if isinstance(message_body, list):
            for message in message_body:
                process_message(message)
        else:
            process_message(message_body)
            
    return {
        'statusCode': 200,
        'body': json.dumps('Request was successful')
    }

def process_message(message):
    user_id = message.get('userid')
    version = message.get('Version')
    response_data = message.get('response')

    if not user_id or not version or not response_data:
        print(f"Missing data in message: {message}")
        return

    update_expression = "SET Version = :version, #response_attr = :response_value"
    expression_attribute_values = {
        ':version': version,
        ':response_value': response_data
    }
    expression_attribute_names = {
        '#response_attr': 'response'
    }

    try:
        table.update_item(
            Key={'userid': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ExpressionAttributeNames=expression_attribute_names,
            ReturnValues="UPDATED_NEW"
        )
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        print(f"No item found with the key {user_id}, creating a new item...")
        table.put_item(Item={'userid': user_id, 'Version': version, 'response': response_data})
    except Exception as e:
        print(f"Failed to update item: {e}")

