import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter;

const getTransporter = () => {
  if (!env.emailUser || !env.emailPass) {
    throw new Error("Email credentials are missing in environment variables");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.emailUser,
        pass: env.emailPass,
      },
    });
  }

  return transporter;
};

export const sendEmail = async (to, subject, text) => {
  await getTransporter().sendMail({
    from: env.emailUser,
    to,
    subject,
    text,
  });
};
