import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.set("session", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return Response.json({
    success: true,
    message: "با موفقیت خارج شدید",
  });
}
