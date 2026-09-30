import { randomInt, randomUUID, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import {
  normalizePhone,
  otpDigest,
  matchesOtp,
  failedAttempt,
  OTP_SECONDS,
} from "@/lib/otp-policy";

export const blockedMessage = "شماره شما بلاک شد؛ با پشتیبانی تماس بگیرید.";

/**
 * OTP flow
 *
 * - OTP: 6 digits
 * - Rate limit:
 *   - per rateKey: 30 requests/hour
 *   - global: 300 requests/hour
 *   - per phone: 5 SMS/hour
 *   - resend cooldown: 60 seconds
 * - Failed verification attempts are serialized using PostgreSQL
 *   transaction-level advisory locks.
 *
 * Important:
 * pg_advisory_xact_lock() returns void.
 * Therefore it MUST NOT be called through $queryRaw(),
 * because Prisma tries to deserialize the void column.
 * $executeRaw() is used instead.
 */

/**
 * Acquire a transaction-level PostgreSQL advisory lock.
 *
 * The lock is automatically released when the current transaction
 * commits or rolls back.
 */
async function lockOtpKey(tx: Pick<typeof prisma, "$executeRaw">, key: string) {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${key})::bigint)
  `;
}

export async function requestOtp(raw: unknown, rateKey: string) {
  const phone = normalizePhone(raw);
  const now = new Date();
  const challengeId = randomUUID();

  /**
   * Development-only fixed OTP.
   *
   * Example:
   * OTP_LOCAL_TEST_CODE=123456
   */
  const localCode =
    process.env.NODE_ENV === "development" &&
    /^\d{6}$/.test(process.env.OTP_LOCAL_TEST_CODE || "")
      ? process.env.OTP_LOCAL_TEST_CODE!
      : null;

  /**
   * OTP is always 6 digits.
   *
   * randomInt max is exclusive:
   * 100000 <= code <= 999999
   */
  const code = localCode || String(randomInt(100000, 1000000));

  const digest = otpDigest(phone, challengeId, code);

  const result = await prisma.$transaction(async (tx) => {
    /**
     * ------------------------------------------------------------
     * 1. Global / rateKey lock
     * ------------------------------------------------------------
     *
     * We hash the rateKey so the advisory-lock key remains compact.
     */
    const key = createHash("sha256").update(rateKey).digest("hex");

    await lockOtpKey(tx, `otp-rate:${key}`);

    const bucket = await tx.otpRateBucket.findUnique({
      where: { key },
    });

    const reset =
      !bucket || now.getTime() - bucket.windowStart.getTime() >= 3600000;

    const limit = rateKey === "global" ? 300 : 30;

    if (!reset && bucket.count >= limit) {
      return {
        error: "تعداد درخواست‌ها زیاد است؛ یک ساعت بعد تلاش کنید.",
      };
    }

    await tx.otpRateBucket.upsert({
      where: { key },

      create: {
        key,
        count: 1,
        windowStart: now,
      },

      update: {
        count: reset
          ? 1
          : {
              increment: 1,
            },

        ...(reset
          ? {
              windowStart: now,
            }
          : {}),
      },
    });

    /**
     * ------------------------------------------------------------
     * 2. Phone-specific lock
     * ------------------------------------------------------------
     *
     * This prevents concurrent OTP requests for the same phone
     * from bypassing resend / hourly limits.
     */
    await lockOtpKey(tx, `otp:${phone}`);

    const row = await tx.loginOtp.upsert({
      where: { phone },

      create: {
        phone,
      },

      update: {},
    });

    /**
     * ------------------------------------------------------------
     * 3. Blocked account
     * ------------------------------------------------------------
     */
    if (row.blockedAt) {
      return {
        error: blockedMessage,
      };
    }

    /**
     * ------------------------------------------------------------
     * 4. Resend cooldown
     * ------------------------------------------------------------
     */
    if (row.lastSentAt && now.getTime() - row.lastSentAt.getTime() < 60000) {
      return {
        error: "برای ارسال مجدد حداقل یک دقیقه صبر کنید.",
      };
    }

    /**
     * ------------------------------------------------------------
     * 5. Per-phone hourly SMS limit
     * ------------------------------------------------------------
     */
    const newWindow = now.getTime() - row.windowStart.getTime() >= 3600000;

    if (!newWindow && row.sentCount >= 5) {
      return {
        error: "حداکثر پنج پیامک در ساعت؛ بعداً تلاش کنید.",
      };
    }

    /**
     * ------------------------------------------------------------
     * 6. Create new OTP challenge
     * ------------------------------------------------------------
     */
    const expiresAt = new Date(now.getTime() + OTP_SECONDS * 1000);

    await tx.loginOtp.update({
      where: {
        phone,
      },

      data: {
        challengeId,
        digest,
        expiresAt,

        attempts: 0,

        lastSentAt: now,

        sentCount: newWindow
          ? 1
          : {
              increment: 1,
            },

        ...(newWindow
          ? {
              windowStart: now,
            }
          : {}),
      },
    });

    return {
      expiresAt,
    };
  });

  /**
   * Transaction returned an error.
   */
  if ("error" in result) {
    throw new Error(result.error);
  }

  /**
   * Development local OTP:
   * don't send SMS.
   */
  if (localCode) {
    return {
      challengeId,
      expiresAt: result.expiresAt,
    };
  }

  /**
   * ------------------------------------------------------------
   * Send SMS
   * ------------------------------------------------------------
   */
  try {
    const pattern = process.env.FARAZ_SMS_OTP_PATTERN;

    const response = await sendSms(
      pattern
        ? {
            type: "pattern",
            phone,
            patternCode: pattern,

            variables: {
              [process.env.FARAZ_SMS_OTP_VARIABLE || "code"]: code,
            },
          }
        : {
            type: "simple",
            phone,

            message:
              `کد ورود شما: ${code}\n` +
              "اعتبار: ۵ دقیقه. " +
              "این کد را در اختیار دیگران قرار ندهید.",
          },
    );
    console.log(response.status);
    if (!["success", "ok"].includes(String(response.status).toLowerCase())) {
      throw new Error("provider rejected");
    }
  } catch {
    /**
     * SMS provider failed.
     *
     * Remove the challenge so the failed SMS cannot be used.
     */
    await prisma.loginOtp.updateMany({
      where: {
        phone,
        challengeId,
      },

      data: {
        digest: null,
        challengeId: null,
        expiresAt: null,
      },
    });

    throw new Error(
      "ارسال پیامک انجام نشد؛ تنظیمات سرویس را بررسی کنید یا کمی بعد تلاش کنید.",
    );
  }

  return {
    challengeId,
    expiresAt: result.expiresAt,
  };
}

/**
 * Convert Persian / Arabic digits to English digits.
 */
function normalizeOtpCode(rawCode: unknown): string {
  if (typeof rawCode !== "string") {
    return "";
  }

  return rawCode
    .replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
    .trim();
}

export async function verifyOtp(challengeId: string, rawCode: unknown) {
  const code = normalizeOtpCode(rawCode);

  /**
   * First lookup.
   *
   * We only use this to discover the phone associated with
   * the challenge. The actual verification is performed again
   * inside a transaction after acquiring the phone lock.
   */
  const found = await prisma.loginOtp.findUnique({
    where: {
      challengeId,
    },
  });

  if (!found) {
    return {
      error: "کد منقضی شده است؛ دوباره شماره را وارد کنید.",
      restart: true,
    };
  }

  return prisma.$transaction(async (tx) => {
    /**
     * ------------------------------------------------------------
     * 1. Lock this phone
     * ------------------------------------------------------------
     *
     * This is important because two verification requests can
     * arrive at almost exactly the same time.
     */
    await lockOtpKey(tx, `otp:${found.phone}`);

    /**
     * Re-read after acquiring the lock.
     *
     * Never rely on the first read because another request could
     * have changed the OTP before this transaction acquired lock.
     */
    const row = await tx.loginOtp.findUnique({
      where: {
        phone: found.phone,
      },
    });

    /**
     * ------------------------------------------------------------
     * 2. Blocked account
     * ------------------------------------------------------------
     */
    if (row?.blockedAt) {
      return {
        error: blockedMessage,
        restart: true,
      };
    }

    /**
     * ------------------------------------------------------------
     * 3. Validate challenge
     * ------------------------------------------------------------
     */
    if (
      !row ||
      row.challengeId !== challengeId ||
      !row.digest ||
      !row.expiresAt ||
      row.expiresAt <= new Date()
    ) {
      return {
        error: "زمان وارد کردن کد تمام شده؛ دوباره شماره را وارد کنید.",
        restart: true,
      };
    }

    /**
     * ------------------------------------------------------------
     * 4. Validate OTP
     * ------------------------------------------------------------
     */
    const validFormat = /^\d{6}$/.test(code);

    const validCode =
      validFormat &&
      matchesOtp(row.digest, otpDigest(row.phone, challengeId, code));

    if (!validCode) {
      const f = failedAttempt(row.attempts, row.consecutiveFailures);

      await tx.loginOtp.update({
        where: {
          phone: row.phone,
        },

        data: {
          attempts: f.attempts,

          consecutiveFailures: f.consecutiveFailures,

          ...(f.blocked
            ? {
                blockedAt: new Date(),
              }
            : {}),

          ...(f.restart || f.blocked
            ? {
                digest: null,
                challengeId: null,
                expiresAt: null,
              }
            : {}),
        },
      });

      return {
        error: f.blocked
          ? blockedMessage
          : f.restart
            ? "سه بار کد اشتباه وارد شد؛ دوباره شماره را وارد کنید."
            : "کد واردشده غلط است.",

        restart: f.restart || f.blocked,
      };
    }

    /**
     * ------------------------------------------------------------
     * 5. Find existing user
     * ------------------------------------------------------------
     *
     * Legacy Iranian phone formats are supported.
     *
     * We deliberately DO NOT automatically merge accounts.
     */
    const national = row.phone.slice(1);

    const existing = await tx.user.findMany({
      where: {
        phone: {
          in: [row.phone, `+98${national}`, `98${national}`, `0098${national}`],
        },
      },

      take: 2,
    });

    /**
     * More than one account with the same logical phone number
     * requires manual support review.
     */
    if (existing.length > 1) {
      return {
        error: "برای بررسی حساب‌های این شماره با پشتیبانی تماس بگیرید.",
        restart: true,
      };
    }

    /**
     * Demo accounts cannot log in in production.
     */
    if (existing[0]?.demoBatchId && process.env.NODE_ENV === "production") {
      return {
        error: "حساب آزمایشی قابل ورود نیست.",
        restart: true,
      };
    }

    /**
     * ------------------------------------------------------------
     * 6. Create or reuse user
     * ------------------------------------------------------------
     */
    const user =
      existing[0] ??
      (await tx.user.create({
        data: {
          phone: row.phone,
          role: "STUDENT",
        },
      }));

    /**
     * ------------------------------------------------------------
     * 7. Consume OTP
     * ------------------------------------------------------------
     *
     * This makes the OTP single-use.
     */
    await tx.loginOtp.update({
      where: {
        phone: row.phone,
      },

      data: {
        digest: null,
        challengeId: null,
        expiresAt: null,

        attempts: 0,
        consecutiveFailures: 0,
      },
    });

    return {
      user: {
        id: user.id,
        role: user.role,
      },
    };
  });
}
