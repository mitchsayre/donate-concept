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
import { JwtExpiredError } from "aws-jwt-verify/error";
import { google } from "googleapis";
import { encrypt } from "./secrets";

const AWS_REGION = process.env.AWS_REGION!;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!;

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

const PORT = process.env.PORT!;
const STAGE = process.env.STAGE!;
const URL_PROD = process.env.URL_PROD!;
const URL_DEV = process.env.URL_DEV!;
const OAUTH_RESPONSE_ROUTE = process.env.OAUTH_RESPONSE_ROUTE!;
const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY!;

const GOOGLE_URL_STATE_PASSTHROUGH_KEY = process.env.GOOGLE_URL_STATE_PASSTHROUGH_KEY!;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

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
  includeRawJwtInErrors: true,
});

let redirectUrlDomain;
if (STAGE === "production") {
  redirectUrlDomain = `https://${URL_PROD}`;
} else if (STAGE === "development") {
  redirectUrlDomain = `https://${URL_DEV}`;
} else {
  redirectUrlDomain = `http://localhost:${PORT}`;
}
let redirectUrl = `${redirectUrlDomain}/${OAUTH_RESPONSE_ROUTE}`;
const googleOAuth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  redirectUrlDomain
);

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
    // await cognitoVerifyAccessToken(AuthenticationResult.AccessToken);
  }

  // if (response.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED) {

  // }

  // if (sessionToken) {
  //   await verifySoftwareToken(sessionToken);
  // }

  // console.log(response);
  return response;
}

export async function cognitoRefreshAccessToken(refreshToken: string) {
  const command = new AdminInitiateAuthCommand({
    UserPoolId: COGNITO_USER_POOL_ID,
    ClientId: COGNITO_CLIENT_ID,
    AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  const response = await client.send(command);
  const authenticationResult = response.AuthenticationResult;
  if (authenticationResult?.AccessToken) {
    return authenticationResult.AccessToken;
  } else {
    throw new Error("Failed to refresh access token.");
  }

  // if (response.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED) {

  // }

  // if (sessionToken) {
  //   await verifySoftwareToken(sessionToken);
  // }

  // console.log(response);
  // return response;
}

// type CognitoValidateOrRefreshAccessTokenResult = {
//   user: User;
//   accessToken: string;
// };
export async function cognitoDecodeAccessToken(accessToken: string) {
  try {
    const payload = await verifier.verify(accessToken);
    return payload;
  } catch (error) {
    if (error instanceof JwtExpiredError) {
      return error;
    }
    throw new Error("Token is invalid");
  }
}

export function googleBuildAuthUrl() {
  // TODO: consider using googleOAuth2Client.generateAuthUrl
  // TODO: Use login_hint query param to pre-fill email address for sign up
  // TODO: Fix state to prevent xsrf attacks: https://developers.google.com/identity/openid-connect/openid-connect#createxsrftoken
  const stateForCsrfProtection = {
    key: GOOGLE_URL_STATE_PASSTHROUGH_KEY,
    unixTime: Date.now(),
  };
  const statePassthroughParam = JSON.stringify(stateForCsrfProtection);
  let statePassthroughParamEncrypted = encrypt(statePassthroughParam, SESSION_ENCRYPTION_KEY);
  statePassthroughParamEncrypted = encodeURIComponent(statePassthroughParamEncrypted);

  // let redirectUrlDomain;
  // if (STAGE === "production") {
  //   redirectUrlDomain = `https://${URL_PROD}`;
  // } else if (STAGE === "development") {
  //   redirectUrlDomain = `https://${URL_DEV}`;
  // } else {
  //   redirectUrlDomain = `http://localhost:${PORT}`;
  // }
  // let redirectUrl = `${redirectUrlDomain}/${OAUTH_RESPONSE_ROUTE}`;
  let redirectUrlEncoded = encodeURIComponent(redirectUrl);

  const scope = encodeURIComponent("https://www.googleapis.com/auth/userinfo.email");

  return `https://accounts.google.com/o/oauth2/v2/auth?
scope=${scope}&
access_type=online&
include_granted_scopes=true&
response_type=code&
state=${statePassthroughParamEncrypted}&
redirect_uri=${redirectUrlEncoded}&
client_id=${GOOGLE_CLIENT_ID}`;
}

export async function googleFetchEmailFromResponseCode(code: string) {
  const userScopedGoogleOAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUrl
  );

  const { tokens } = await userScopedGoogleOAuth2Client.getToken(code);
  userScopedGoogleOAuth2Client.setCredentials(tokens);

  const userScopedGoogleOAuth2 = google.oauth2({
    auth: userScopedGoogleOAuth2Client,
    version: "v2",
  });
  const userInfo = await userScopedGoogleOAuth2.userinfo.get();

  return userInfo.data.email;
}
