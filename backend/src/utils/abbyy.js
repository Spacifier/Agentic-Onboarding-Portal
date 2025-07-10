import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const CLIENT_ID = process.env.ABBYY_CLIENT_ID;
const CLIENT_SECRET = process.env.ABBYY_CLIENT_SECRET;
const SKILL_ID = process.env.ABBYY_SKILL_ID;

let tokenCache = null;
let tokenExpiry = 0;

const getAbbyyAccessToken = async () => {
  const now = Date.now();
  if (tokenCache && tokenExpiry > now) return tokenCache;

  const res = await axios.post(
    "https://vantage-us.abbyy.com/auth2/connect/token",
    new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "openid permissions global.wildcard"
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  tokenCache = res.data.access_token;
  tokenExpiry = now + 55 * 60 * 1000; // 55 minutes
  return tokenCache;
};

export const launchAbbyyTransaction = async (filePath, originalname) => {
  const accessToken = await getAbbyyAccessToken();
  const fileStream = fs.createReadStream(filePath);
  const form = new FormData();

  form.append("file", fileStream, originalname);

  const response = await axios.post(
    `https://vantage-us.abbyy.com/api/publicapi/v1/transactions/launch?skillId=${SKILL_ID}`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${accessToken}`,
        "X-File-Name": originalname,
        "X-Transaction-Timeout": "300"
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    }
  );

  return {
    transactionId: response.data.transactionId,
    file: originalname
  };
};
