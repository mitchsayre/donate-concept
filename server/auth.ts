import {
  AdminInitiateAuthCommand,
  AssociateSoftwareTokenCommand,
  AuthCredentialsAuthenticationResultType,
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
import axios from "axios";
import { encrypt } from "./secrets";
// import { microsoftAssertionToken } from "./cert";

const AWS_REGION = process.env.AWS_REGION!;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!;

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET!;
const COGNITO_HOSTED_URL = process.env.COGNITO_HOSTED_URL!;

const PORT = process.env.PORT!;
const STAGE = process.env.STAGE!;
const URL_PROD = process.env.URL_PROD!;
const URL_DEV = process.env.URL_DEV!;
const OAUTH_RESPONSE_ROUTE = process.env.OAUTH_RESPONSE_ROUTE!;
const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY!;

const GOOGLE_URL_STATE_PASSTHROUGH_KEY = process.env.GOOGLE_URL_STATE_PASSTHROUGH_KEY!;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!;

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

let redirectUrlDomain: string;
if (STAGE === "production") {
  redirectUrlDomain = `https://${URL_PROD}`;
} else if (STAGE === "development") {
  redirectUrlDomain = `https://${URL_DEV}`;
} else {
  redirectUrlDomain = `http://localhost:${PORT}`;
}
let redirectUrl = `${redirectUrlDomain}/${OAUTH_RESPONSE_ROUTE}`;

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

export type IdentityProvider = "Google" | "Microsoft";
export type StatePassthroughType = {
  key: string;
  unixTime: number;
  identityProvider: IdentityProvider;
};
export function cognitoBuildAuthUrl(identityProvider: IdentityProvider) {
  // TODO: Use login_hint query param to pre-fill email address for sign up: https://github.com/aws-amplify/amplify-js/issues/8951
  // TODO: Fix state to prevent xsrf attacks: https://developers.google.com/identity/openid-connect/openid-connect#createxsrftoken
  const stateForCsrfProtection: StatePassthroughType = {
    key: GOOGLE_URL_STATE_PASSTHROUGH_KEY,
    unixTime: Date.now(),
    identityProvider: identityProvider,
  };
  const statePassthroughParam = JSON.stringify(stateForCsrfProtection);
  let statePassthroughParamEncrypted = encrypt(statePassthroughParam, SESSION_ENCRYPTION_KEY);
  statePassthroughParamEncrypted = encodeURIComponent(statePassthroughParamEncrypted);

  let redirectUrlEncoded = encodeURIComponent(redirectUrl);

  const scopeArray = ["openid", "email"];
  // if (identityProvider === "Microsoft") {
  //   scopeArray.push("offline_access");
  // }
  const scope = encodeURIComponent(scopeArray.join(" "));

  let identityUrl: string;
  let clientId: string;
  if (identityProvider === "Google") {
    identityUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    clientId = GOOGLE_CLIENT_ID;
  } else if (identityProvider === "Microsoft") {
    identityUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
    clientId = MICROSOFT_CLIENT_ID;
  } else {
    throw Error(`Invalid identity provider: ${identityProvider}.`);
  }

  return `${identityUrl}?
response_type=code&
scope=${scope}&
state=${statePassthroughParamEncrypted}&
access_type=online&
include_granted_scopes=true&
redirect_uri=${redirectUrlEncoded}&
client_id=${clientId}&`;
}

export async function cognitoFetchCredentialsFromOAuthCode(
  code: string
): Promise<AuthCredentialsAuthenticationResultType> {
  const url = `${COGNITO_HOSTED_URL}/oauth2/token`;
  const data = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: COGNITO_CLIENT_ID,
    code: code,
    redirect_uri: redirectUrl,
  });

  const basicAuth = `Basic ${btoa(`${COGNITO_CLIENT_ID}:${COGNITO_CLIENT_SECRET}`)}`;
  const config = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuth,
    },
  };

  const response = await axios.post(url, data, config);

  return {
    AccessToken: response.data.access_token,
    ExpiresIn: response.data.expires_in,
    IdToken: response.data.id_token,
    RefreshToken: response.data.refresh_token,
    TokenType: response.data.token_type,
  };
}

type AuthCredentials = {
  email: string;
  tokens: AuthCredentialsAuthenticationResultType;
};

export async function googleFetchCredentialsFromOAuthCode(
  code: string
): Promise<AuthCredentials | undefined> {
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
  const email = userInfo.data.email;
  const accessToken = tokens.access_token;
  if (email && accessToken) {
    return {
      email,
      tokens: {
        AccessToken: accessToken,
        ExpiresIn: tokens.expiry_date ?? undefined,
        IdToken: tokens.id_token ?? undefined,
        RefreshToken: tokens.refresh_token ?? undefined,
        TokenType: tokens.token_type ?? undefined,
      },
    };
  }
}

export async function microsoftFetchCredentialsFromOAuthCode(
  code: string
): Promise<AuthCredentialsAuthenticationResultType> {
  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/token`;
  const data = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    code: code,
    redirect_uri: redirectUrl,
    // client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    // client_assertion: microsoftAssertionToken,
  });

  const config = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  const response = await axios.post(url, data, config);

  return {
    AccessToken: response.data.access_token,
    ExpiresIn: response.data.expires_in,
    IdToken: response.data.id_token,
    RefreshToken: response.data.refresh_token,
    TokenType: response.data.token_type,
  };
}
