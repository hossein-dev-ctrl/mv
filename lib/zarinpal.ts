const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID!;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const SANDBOX = process.env.ZARINPAL_SANDBOX === "true";

const BASE_URL = SANDBOX
  ? "https://sandbox.zarinpal.com"
  : "https://payment.zarinpal.com";

type RequestPaymentParams = {
  amount: number;
  description: string;
  email?: string;
  mobile?: string;
};

export async function requestPayment({
  amount,
  description,
  email,
  mobile,
}: RequestPaymentParams) {
  const response = await fetch(`${BASE_URL}/pg/v4/payment/request.json`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },

    body: JSON.stringify({
      merchant_id: MERCHANT_ID,

      amount,

      description,

      callback_url: `${APP_URL}/api/payments/zarinpal/callback`,

      metadata: {
        email: email || undefined,
        mobile: mobile || undefined,
      },
    }),
  });

  const data = await response.json();
  console.log(data);

  if (!response.ok) {
    console.log("COURSE STATUS:", status);
    throw new Error("خطا در ارتباط با زرین‌پال");
  }

  return data;
}

export async function verifyPayment(amount: number, authority: string) {
  const response = await fetch(`${BASE_URL}/pg/v4/payment/verify.json`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },

    body: JSON.stringify({
      merchant_id: MERCHANT_ID,

      amount,

      authority,
    }),
  });

  const data = await response.json();

  return data;
}

export function getPaymentUrl(authority: string) {
  return `${BASE_URL}/pg/StartPay/${authority}`;
}
