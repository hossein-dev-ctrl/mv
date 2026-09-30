import axios from "axios";

const FARAZ_API_URL = "https://api.iranpayamak.com/ws/v1";

type SimpleSmsParams = {
  type: "simple";
  phone: string;
  message: string;
};

type PatternSmsParams = {
  type: "pattern";
  phone: string;
  patternCode: string;
  variables?: Record<string, string | number>;
};

type SendSmsParams = SimpleSmsParams | PatternSmsParams;

type FarazSmsResponse = {
  status: string;
  data?: unknown;
  messages?: string;
  code?: string | number;
};

export async function sendSms(
  params: SendSmsParams,
): Promise<FarazSmsResponse> {
  const apiKey = process.env.FARAZ_SMS_API_KEY;
  const lineNumber = process.env.FARAZ_SMS_LINE_NUMBER;

  if (!apiKey) {
    throw new Error("FARAZ_SMS_API_KEY تنظیم نشده است.");
  }

  if (!lineNumber) {
    throw new Error("FARAZ_SMS_LINE_NUMBER تنظیم نشده است.");
  }

  if (!params.phone) {
    throw new Error("شماره موبایل ارسال نشده است.");
  }

  try {
    let response;

    // ==========================================
    // SIMPLE SMS
    // ==========================================

    if (params.type === "simple") {
      if (!params.message) {
        throw new Error("متن پیامک ارسال نشده است.");
      }

      response = await axios.post<FarazSmsResponse>(
        `${FARAZ_API_URL}/sms/simple`,
        {
          text: params.message,
          line_number: lineNumber,
          recipients: [params.phone],
          number_format: "english",
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Api-Key": apiKey,
          },
          timeout: 15000,
        },
      );
    }

    // ==========================================
    // PATTERN SMS
    // ==========================================
    else {
      if (!params.patternCode) {
        throw new Error("patternCode ارسال نشده است.");
      }

      console.log("========== FARAZ PATTERN REQUEST ==========");
      console.log({
        url: `${FARAZ_API_URL}/sms/pattern`,
        patternCode: params.patternCode,
        attributes: params.variables ?? {},
        recipient: params.phone,
        line_number: lineNumber,
        number_format: "english",
      });
      console.log("===========================================");
      response = await axios.post<FarazSmsResponse>(
        `${FARAZ_API_URL}/sms/pattern`,
        {
          code: params.patternCode,

          attributes: params.variables ?? {},

          recipient: params.phone,

          line_number: lineNumber,

          number_format: "english",
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Api-Key": apiKey,
          },
          timeout: 15000,
        },
      );
    }

    console.log("========== FARAZ SMS SUCCESS ==========");
    console.log("Status:", response.status);
    console.log("Response:", response.data);
    console.log("=======================================");

    return response.data;
  } catch (error: unknown) {
    console.error("========== FARAZ SMS ERROR ==========");

    if (axios.isAxiosError(error)) {
      console.error("Axios message:", error.message);
      console.error("HTTP status:", error.response?.status);
      console.error("Response data:", error.response?.data);
      console.error("Response headers:", error.response?.headers);

      console.error("Request URL:", error.config?.url);
      console.error("Request method:", error.config?.method);

      console.error("Request data:", error.config?.data);
    } else if (error instanceof Error) {
      console.error("Error:", error.message);
      console.error("Stack:", error.stack);
    } else {
      console.error("Unknown error:", error);
    }

    console.error("====================================");

    throw new Error("ارسال پیامک ناموفق بود؛ جزئیات خطا در ترمینال ثبت شد.");
  }
}
