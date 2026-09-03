import { env } from "../config/env.js";

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildOtpEmail = ({
  otp,
  title = "Your OTP Code",
  intro,
  purpose = "account verification",
  expiryMinutes = env.otpExpiryMinutes,
}) => {
  const appName = escapeHtml(env.appName);
  const safeTitle = escapeHtml(title);
  const safePurpose = escapeHtml(purpose);
  const safeExpiry = escapeHtml(expiryMinutes);
  const safeOtp = escapeHtml(otp);
  const defaultIntro = `Your One-Time Password (OTP) for ${purpose} is:`;
  const safeIntro = escapeHtml(intro || defaultIntro);
  const plainIntro = intro || defaultIntro;

  return {
    subject: `${title} - ${env.appName}`,
    text: `Hello,\n\n${plainIntro}\n\n${otp}\n\nThis OTP is valid for ${expiryMinutes} minutes. Please do not share this code with anyone.\n\nIf you didn't request this code, please ignore this email.\n\nThank you for using our service!`,
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #f4f5f7;
        color: #15213b;
        font-family: Arial, Helvetica, sans-serif;
        -webkit-text-size-adjust: 100%;
      }

      .wrapper {
        width: 100%;
        padding: 24px 12px;
        background: #f4f5f7;
      }

      .container {
        width: 100%;
        max-width: 760px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.16);
      }

      .header {
        padding: 29px 24px;
        background: #5145e8;
        color: #ffffff;
        text-align: center;
      }

      h1 {
        margin: 0;
        color: #ffffff;
        font-size: 36px;
        line-height: 43px;
        font-weight: 700;
      }

      .content {
        padding: 42px 38px 36px;
      }

      p {
        margin: 0 0 28px;
        color: #15213b;
        font-size: 20px;
        line-height: 30px;
      }

      .otp {
        margin: 30px 0 32px;
        padding: 21px 16px;
        border-radius: 8px;
        background: #f0f1f5;
        color: #5145e8;
        font-size: 44px;
        line-height: 52px;
        font-weight: 700;
        letter-spacing: 2px;
        text-align: center;
      }

      .expiry {
        font-weight: 700;
      }

      .closing {
        margin-bottom: 0;
      }

      .footer {
        padding: 22px 24px;
        background: #f0f1f5;
        color: #15213b;
        font-size: 17px;
        line-height: 24px;
        text-align: center;
      }

      @media (max-width: 480px) {
        .wrapper {
          padding: 12px 8px;
        }

        .header {
          padding: 24px 16px;
        }

        h1 {
          font-size: 28px;
          line-height: 34px;
        }

        .content {
          padding: 28px 20px 30px;
        }

        p {
          font-size: 16px;
          line-height: 25px;
          margin-bottom: 22px;
        }

        .otp {
          padding: 18px 12px;
          font-size: 34px;
          line-height: 40px;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <h1>${safeTitle}</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>${safeIntro}</p>
          <div class="otp" aria-label="Your OTP code">${safeOtp}</div>
          <p>This OTP is valid for <span class="expiry">${safeExpiry} minutes</span>. Please do not share this code with anyone.</p>
          <p>If you didn't request this ${safePurpose} code, please ignore this email.</p>
          <p class="closing">Thank you for using our service!</p>
        </div>
        <div class="footer">
          &copy; 2024 ${appName}. All rights reserved.
        </div>
      </div>
    </div>
  </body>
</html>`,
  };
};
