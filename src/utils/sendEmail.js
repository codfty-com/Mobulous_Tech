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

export const sendEmail = async (to, subject, message) => {
  const mail = {
    from: env.emailUser,
    to,
    subject,
  };

  if (typeof message === "string") {
    mail.text = message;
  } else {
    mail.text = message.text;
    mail.html = message.html;
  }

  await getTransporter().sendMail(mail);
};
