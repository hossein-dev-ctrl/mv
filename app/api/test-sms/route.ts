import { NextRequest, NextResponse } from "next/server";
import { sendSms } from "@/lib/sms";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const phone = String(body.phone ?? "").trim();
    const patternCode = String(body.patternCode ?? "").trim();
    const code = Number(body.code);

    if (!phone) {
      return NextResponse.json(
        { success: false, message: "شماره موبایل وارد نشده است." },
        { status: 400 },
      );
    }

    if (!patternCode) {
      return NextResponse.json(
        { success: false, message: "Pattern Code وارد نشده است." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(code) || code < 100000 || code > 999999) {
      return NextResponse.json(
        { success: false, message: "کد باید یک عدد ۶ رقمی باشد." },
        { status: 400 },
      );
    }

    console.log("========== TEST SMS ==========");
    console.log({
      phone,
      patternCode,
      variables: {
        code,
      },
    });
    console.log("==============================");

    const result = await sendSms({
      type: "pattern",
      phone,
      patternCode,
      variables: {
        code,
      },
    });

    console.log("========== FARAZ RESPONSE ==========");
    console.log(result);
    console.log("====================================");

    return NextResponse.json({
      success: true,
      message: "پیامک با موفقیت به سرویس ارسال شد.",
      result,
    });
  } catch (error) {
    console.error("========== TEST SMS ERROR ==========");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    console.error("====================================");

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "ارسال پیامک ناموفق بود.",
      },
      { status: 500 },
    );
  }
}
