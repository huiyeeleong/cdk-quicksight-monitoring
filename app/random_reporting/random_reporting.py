import json
import random
import string
from time import sleep
from urllib import request, parse

def lambda_handler(event, context):
    try:
        N = int(event['N']) # Duration in seconds
        M = int(event['M']) # Transactions per second
    except KeyError:
        return {
            'statusCode': 400,
            'body': json.dumps('Please provide M and N values.')
        }

    # Update the endpoint to /randomdata
    api_gateway_endpoint = "https://a723thp111.execute-api.ap-southeast-2.amazonaws.com/prod/randomdata"

    output_data = []  # To store the output data

    for i in range(N):
        response_data = []
        for j in range(M):
            user_id = ''.join(random.choices(string.ascii_letters + string.digits, k=6))
            response = {f'q{idx+1}': f'value{random.randint(1,3)}' for idx in range(random.randint(1,10))} # Changed format to dictionary
            data = {
                'Version': 'your_version_here', # add version parameter here
                'userid': user_id,
                'response': response
            }
            response_data.append(data)
        
        # Add generated data to the output data
        output_data.extend(response_data)

        # POST the generated data to the API Gateway endpoint
        headers = {'Content-Type': 'application/json'}
        req = request.Request(api_gateway_endpoint, data=json.dumps(response_data).encode('utf-8'), headers=headers, method='POST')

        try:
            with request.urlopen(req) as f:
                if f.status != 200:
                    return {
                        'statusCode': f.status,
                        'body': json.dumps({'error': 'Failed to send data to API Gateway', 'details': f.read().decode('utf-8')})
                    }
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Exception occurred', 'details': str(e)})
            }
        
        # Sleep for 1 second before generating new transactions (to control the duration N)
        sleep(1)

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Data sent successfully', 'output_data': output_data})  # Include output data in the response
    }
