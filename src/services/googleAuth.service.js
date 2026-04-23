import { OAuth2Client } from "google-auth-library";

const getGoogleAudience = () =>
  (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || "")
    .split(",")
    .map((clientId) => clientId.trim())
    .filter(Boolean);

let googleClient;

const getGoogleClient = () => {
  const audience = getGoogleAudience();

  if (!audience.length) {
    throw new Error("Google login is not configured on the server");
  }

  if (!googleClient) {
    googleClient = new OAuth2Client();
  }

  return { client: googleClient, audience };
};

export const verifyGoogleIdToken = async (idToken) => {
  const { client, audience } = getGoogleClient();

  const ticket = await client.verifyIdToken({
    idToken,
    audience,
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload?.email) {
    throw new Error("Google token payload is incomplete");
  }

  if (payload.email_verified !== true) {
    throw new Error("Google account email is not verified");
  }

  return {
    googleId: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name: payload.name?.trim() || "",
    profilePicture: payload.picture || "",
  };
};
