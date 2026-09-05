"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LessonStatus = "DRAFT" | "PUBLISHED";

type Props = {
  lessonId: string;
  initialTitle: string;
  initialDescription: string;
  initialVideoDuration: number | null;
  initialStatus: LessonStatus;
};

export default function EditLessonForm({
  lessonId,
  initialTitle,
  initialDescription,
  initialVideoDuration,
  initialStatus,
}: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  const [videoDuration, setVideoDuration] = useState(
    initialVideoDuration ? String(initialVideoDuration) : "",
  );

  const [status, setStatus] = useState<LessonStatus>(initialStatus);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const duration =
        videoDuration.trim() === "" ? null : Number(videoDuration);

      if (
        duration !== null &&
        (!Number.isFinite(duration) ||
          duration < 0 ||
          !Number.isInteger(duration))
      ) {
        setError("مدت ویدئو باید یک عدد صحیح بر حسب ثانیه باشد.");

        setLoading(false);
        return;
      }

      const response = await fetch(`/api/teacher/lessons/${lessonId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          videoDuration: duration,
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "خطا در ذخیره اطلاعات");
      }

      setMessage("اطلاعات درس با موفقیت ذخیره شد.");

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "خطایی هنگام ذخیره اطلاعات رخ داد.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold">✏️ ویرایش درس</h2>

        <p className="mt-1 text-sm text-gray-500">
          اطلاعات این درس را ویرایش کنید.
        </p>
      </div>

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label
            htmlFor="lesson-title"
            className="mb-2 block text-sm font-medium"
          >
            عنوان درس
          </label>

          <input
            id="lesson-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder="مثلاً آشنایی با محیط Scratch Junior"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="lesson-description"
            className="mb-2 block text-sm font-medium"
          >
            توضیحات درس
          </label>

          <textarea
            id="lesson-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={7}
            placeholder="توضیحات کامل این درس را وارد کنید..."
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 leading-7 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        {/* Video Duration */}
        <div>
          <label
            htmlFor="video-duration"
            className="mb-2 block text-sm font-medium"
          >
            مدت ویدئو
          </label>

          <input
            id="video-duration"
            type="number"
            min="0"
            step="1"
            value={videoDuration}
            onChange={(event) => setVideoDuration(event.target.value)}
            placeholder="مثلاً 420"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />

          <p className="mt-2 text-xs text-gray-400">
            مدت ویدئو را بر حسب ثانیه وارد کنید.
            <br />
            مثال: 420 ثانیه = 7 دقیقه
          </p>
        </div>

        {/* Status */}
        <div>
          <label
            htmlFor="lesson-status"
            className="mb-2 block text-sm font-medium"
          >
            وضعیت درس
          </label>

          <select
            id="lesson-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as LessonStatus)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          >
            <option value="DRAFT">پیش‌نویس (Draft)</option>

            <option value="PUBLISHED">منتشر شده (Published)</option>
          </select>

          <div className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            {status === "DRAFT" ? (
              <>
                🟡 این درس در حالت پیش‌نویس است و برای دانشجویان نمایش داده
                نمی‌شود.
              </>
            ) : (
              <>🟢 این درس منتشر شده و برای دانشجویان قابل نمایش است.</>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            ❌ {error}
          </div>
        )}

        {/* Success */}
        {message && (
          <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
            ✅ {message}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}
