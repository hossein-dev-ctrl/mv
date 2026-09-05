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

    // ==========================================
    // SUCCESS LOG
    // ==========================================

    console.log("========== FARAZ SMS RESULT ==========");
    console.dir(response.data, { depth: null });
    console.log("======================================");

    return response.data;
  } catch (error: unknown) {
    console.error("========== FARAZ SMS ERROR ==========");

    if (axios.isAxiosError(error)) {
      console.error("HTTP Status:", error.response?.status);

      console.error("Response:", JSON.stringify(error.response?.data, null, 2));

      console.error("Request URL:", error.config?.url);

      // API Key را هرگز در لاگ نمایش نمی‌دهیم
      console.error("Request Headers:", {
        Accept: error.config?.headers?.Accept,
        "Content-Type": error.config?.headers?.["Content-Type"],
        "Api-Key": "[HIDDEN]",
      });

      throw new Error(
        JSON.stringify(
          error.response?.data ?? {
            message: error.message,
          },
          null,
          2,
        ),
      );
    }

    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.dir(error, {
        depth: null,
        showHidden: true,
      });
    }

    console.error("====================================");

    throw error;
  }
}
