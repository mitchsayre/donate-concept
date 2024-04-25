import {
  AdminInitiateAuthCommand,
  AuthFlowType,
  CognitoIdentityProvider,
} from "@aws-sdk/client-cognito-identity-provider";

const AWS_REGION = process.env.AWS_REGION!;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!;

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

export const client = new CognitoIdentityProvider({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

export async function getCognitoUser(username: string, password: string) {
  const command = new AdminInitiateAuthCommand({
    UserPoolId: COGNITO_USER_POOL_ID,
    ClientId: COGNITO_CLIENT_ID,
    AuthFlow: AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });

  const response = await client.send(command);
  console.log(response);
  return response;
}
