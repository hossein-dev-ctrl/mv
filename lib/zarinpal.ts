const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const SANDBOX = process.env.ZARINPAL_SANDBOX === "true";

const BASE_URL = SANDBOX
  ? "https://sandbox.zarinpal.com"
  : "https://payment.zarinpal.com";

type RequestPaymentParams = {
  /**
   * مبلغ ورودی پروژه به تومان است.
   * قبل از ارسال به زرین‌پال به ریال تبدیل می‌شود.
   */
  amount: number;
  description: string;
  email?: string;
  mobile?: string;
};

type ZarinPalResponse<T = unknown> = {
  data?: T;
  errors?: unknown;
};

type ZarinPalPaymentData = {
  code?: number;
  message?: string;
  authority?: string;
  fee_type?: string;
  fee?: number;
};

type ZarinPalVerifyData = {
  code?: number;
  message?: string;
  card_hash?: string;
  card_pan?: string;
  ref_id?: number;
  fee_type?: string;
  fee?: number;
};

function getRialAmount(amountInToman: number) {
  if (!Number.isFinite(amountInToman)) {
    throw new Error("مبلغ پرداخت نامعتبر است.");
  }

  if (amountInToman <= 0) {
    throw new Error("مبلغ پرداخت باید بیشتر از صفر باشد.");
  }

  return Math.round(amountInToman * 10);
}

function validateConfig() {
  if (!MERCHANT_ID) {
    throw new Error("ZARINPAL_MERCHANT_ID تنظیم نشده است.");
  }

  if (!APP_URL) {
    throw new Error("NEXT_PUBLIC_APP_URL تنظیم نشده است.");
  }
}

/**
 * ایجاد درخواست پرداخت در زرین‌پال
 */
export async function requestPayment({
  amount,
  description,
  email,
  mobile,
}: RequestPaymentParams) {
  validateConfig();

  const rialAmount = getRialAmount(amount);

  const callbackUrl = `${APP_URL.replace(/\/$/, "")}/api/payments/zarinpal/callback`;

  const payload = {
    merchant_id: MERCHANT_ID,

    amount: rialAmount,

    description,

    callback_url: callbackUrl,

    metadata: {
      ...(email ? { email } : {}),
      ...(mobile ? { mobile } : {}),
    },
  };

  console.log("========== ZARINPAL REQUEST ==========");
  console.log({
    sandbox: SANDBOX,
    amountToman: amount,
    amountRial: rialAmount,
    callbackUrl,
  });
  console.log("======================================");

  try {
    const response = await fetch(`${BASE_URL}/pg/v4/payment/request.json`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify(payload),

      cache: "no-store",
    });

    const data =
      (await response.json()) as ZarinPalResponse<ZarinPalPaymentData>;

    console.log("========== ZARINPAL RESPONSE ==========");
    console.dir(data, { depth: null });
    console.log("========================================");

    if (!response.ok) {
      throw new Error(`خطا در ارتباط با زرین‌پال. HTTP ${response.status}`);
    }

    const code = data?.data?.code;

    if (code !== 100 && code !== 101) {
      console.error("ZARINPAL REQUEST FAILED:", data);

      throw new Error(
        data?.data?.message || "زرین‌پال درخواست پرداخت را قبول نکرد.",
      );
    }

    if (!data?.data?.authority) {
      console.error("ZARINPAL AUTHORITY MISSING:", data);

      throw new Error("Authority از زرین‌پال دریافت نشد.");
    }

    return data;
  } catch (error) {
    console.error("ZARINPAL_REQUEST_ERROR:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("خطا هنگام ایجاد درخواست پرداخت.");
  }
}

/**
 * تأیید پرداخت در زرین‌پال
 */
export async function verifyPayment(amount: number, authority: string) {
  validateConfig();

  if (!authority) {
    throw new Error("Authority برای تأیید پرداخت وجود ندارد.");
  }

  const rialAmount = getRialAmount(amount);

  try {
    const response = await fetch(`${BASE_URL}/pg/v4/payment/verify.json`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({
        merchant_id: MERCHANT_ID,

        amount: rialAmount,

        authority,
      }),

      cache: "no-store",
    });

    const data =
      (await response.json()) as ZarinPalResponse<ZarinPalVerifyData>;

    console.log("========== ZARINPAL VERIFY ==========");
    console.dir(data, { depth: null });
    console.log("======================================");

    if (!response.ok) {
      throw new Error(
        `خطا در ارتباط با زرین‌پال هنگام Verify. HTTP ${response.status}`,
      );
    }

    return data;
  } catch (error) {
    console.error("ZARINPAL_VERIFY_ERROR:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("خطا هنگام تأیید پرداخت.");
  }
}

/**
 * ساخت آدرس انتقال کاربر به درگاه
 */
export function getPaymentUrl(authority: string) {
  if (!authority) {
    throw new Error("Authority برای ساخت لینک پرداخت وجود ندارد.");
  }

  return `${BASE_URL}/pg/StartPay/${authority}`;
}
