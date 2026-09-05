import { NextResponse } from "next/server";
import { sendSms } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const phone = body.phone;

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error: "شماره موبایل وارد نشده است",
        },
        { status: 400 },
      );
    }

    console.log("========== SMS TEST ==========");
    console.log("PHONE:", phone);

    const result = await sendSms({
      type: "simple",
      phone,
      message: "این یک پیامک تستی از پلتفرم آموزشی کودک برنامه نویس است.",
    });

    // const result = await sendSms({
    //   type: "pattern",
    //   phone: "09331990041",
    //   patternCode: "lFYUwXiOfT",
    //   variables: {
    //     ccode: "583214",
    //   },
    // });
    console.log("SMS RESULT:", result);
    console.dir(result, { depth: null });

    console.log("==============================");

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      result: error,
    });
  }
}
