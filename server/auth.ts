import {
  AdminInitiateAuthCommand,
  AssociateSoftwareTokenCommand,
  AuthFlowType,
  ChallengeName,
  ChallengeNameType,
  CognitoIdentityProvider,
  RespondToAuthChallengeCommandInput,
  VerifySoftwareTokenCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const AWS_REGION = process.env.AWS_REGION!;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!;

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProvider({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const verifier = CognitoJwtVerifier.create({
  userPoolId: COGNITO_USER_POOL_ID,
  tokenUse: "access",
  clientId: COGNITO_CLIENT_ID,
});

export async function cognitoResetPassword(userSub: string, sessionToken: string) {
  const input = {
    ClientId: COGNITO_CLIENT_ID,
    UserPoolId: COGNITO_USER_POOL_ID,
    Session: sessionToken,
    ChallengeName: ChallengeNameType.NEW_PASSWORD_REQUIRED,
    ChallengeResponses: {
      USERNAME: userSub,
      NEW_PASSWORD: "Test1234!",
    },
  };
  const res = await client.adminRespondToAuthChallenge(input);
  console.log(res);
}

export async function cognitoLogin(userSub: string, password: string) {
  const command = new AdminInitiateAuthCommand({
    UserPoolId: COGNITO_USER_POOL_ID,
    ClientId: COGNITO_CLIENT_ID,
    AuthFlow: AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
    AuthParameters: {
      USERNAME: userSub,
      PASSWORD: password,
    },
  });

  const response = await client.send(command);
  const AuthenticationResult = response.AuthenticationResult;
  if (AuthenticationResult?.AccessToken) {
    await cognitoVerifyAccessToken(AuthenticationResult.AccessToken);
  }

  // if (response.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED) {

  // }

  // if (sessionToken) {
  //   await verifySoftwareToken(sessionToken);
  // }

  // console.log(response);
  return response;
}

async function cognitoVerifyAccessToken(accessToken: string) {
  try {
    const payload = await verifier.verify(accessToken);
    console.log("Token is valid. Payload:", payload);
  } catch {
    console.log("Token not valid!");
  }
}
