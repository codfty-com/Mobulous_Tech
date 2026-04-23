const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : value;

const normalizeEmail = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
};

const normalizeOtp = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const parsePhone = (value) => {
  if (value === undefined || value === null || value === "") {
    return { value: undefined };
  }

  const normalized = String(value).replace(/[^\d+]/g, "");

  if (!/^\+?\d{7,15}$/.test(normalized)) {
    return { error: "phone must be a valid phone number" };
  }

  return { value: normalized };
};

const validatePassword = (value, label, errors) => {
  const password = normalizeString(value);

  if (!password) {
    errors.push(`${label} is required`);
    return "";
  }

  if (password.length < 8) {
    errors.push(`${label} must be at least 8 characters long`);
  }

  return password;
};

const buildResult = (errors, data) =>
  errors.length ? { success: false, errors } : { success: true, data };

export const createUserSchema = {
  body(body) {
    const errors = [];
    const name = normalizeString(body.name);
    const email = normalizeEmail(body.email);
    const password = validatePassword(body.password, "password", errors);
    const phoneResult = parsePhone(body.phone);

    if (!name) {
      errors.push("name is required");
    } else if (name.length < 2) {
      errors.push("name must be at least 2 characters long");
    }

    if (!email) {
      errors.push("email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("email must be a valid email address");
    }

    if (phoneResult.error) {
      errors.push(phoneResult.error);
    }

    return buildResult(errors, {
      name,
      email,
      password,
      phone: phoneResult.value,
    });
  },
};

export const verifySignupOtpSchema = {
  body(body) {
    const errors = [];
    const email = normalizeEmail(body.email);
    const otp = normalizeOtp(body.otp);

    if (!email) {
      errors.push("email is required");
    }

    if (!otp) {
      errors.push("otp is required");
    } else if (!/^\d{6}$/.test(otp)) {
      errors.push("otp must be a 6 digit code");
    }

    return buildResult(errors, { email, otp });
  },
};

export const loginUserSchema = {
  body(body) {
    const errors = [];
    const email = normalizeEmail(body.email);
    const password = normalizeString(body.password);

    if (!email) {
      errors.push("email is required");
    }

    if (!password) {
      errors.push("password is required");
    }

    return buildResult(errors, { email, password });
  },
};

export const loginWithGoogleSchema = {
  body(body) {
    const errors = [];
    const idToken = normalizeString(body.idToken);

    if (!idToken) {
      errors.push("idToken is required");
    }

    return buildResult(errors, { idToken });
  },
};

export const forgotPasswordSchema = {
  body(body) {
    const errors = [];
    const email = normalizeEmail(body.email);

    if (!email) {
      errors.push("email is required");
    }

    return buildResult(errors, { email });
  },
};

export const verifyPasswordOtpSchema = verifySignupOtpSchema;

export const resetPasswordSchema = {
  body(body) {
    const errors = [];
    const email = normalizeEmail(body.email);
    const otp = normalizeOtp(body.otp);
    const newPassword = validatePassword(
      body.newPassword,
      "newPassword",
      errors,
    );

    if (!email) {
      errors.push("email is required");
    }

    if (!otp) {
      errors.push("otp is required");
    } else if (!/^\d{6}$/.test(otp)) {
      errors.push("otp must be a 6 digit code");
    }

    return buildResult(errors, {
      email,
      otp,
      newPassword,
    });
  },
};
