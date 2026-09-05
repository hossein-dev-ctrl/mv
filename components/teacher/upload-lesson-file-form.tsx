"use client";

import { ChangeEvent, FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

type Props = {
  lessonId: string;
};

export default function UploadLessonFileForm({ lessonId }: Props) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("ابتدا یک فایل انتخاب کنید.");

      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(`/api/teacher/lessons/${lessonId}/files`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "آپلود فایل ناموفق بود.");
      }

      setMessage("فایل با موفقیت اضافه شد.");

      setFile(null);

      const input = document.getElementById(
        "lesson-file",
      ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "خطایی هنگام آپلود فایل رخ داد.",
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
        <h2 className="text-xl font-bold">📎 افزودن فایل</h2>

        <p className="mt-1 text-sm text-gray-500">
          فایل‌های آموزشی مرتبط با این درس را اضافه کنید.
        </p>
      </div>

      <input
        id="lesson-file"
        type="file"
        accept="
          .pdf,
          .doc,
          .docx,
          .ppt,
          .pptx,
          .zip,
          .jpg,
          .jpeg,
          .png,
          .webp
        "
        onChange={handleFileChange}
        className="block w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm"
      />

      <p className="mt-3 text-xs leading-6 text-gray-400">
        فرمت‌های مجاز: PDF، Word، PowerPoint، ZIP و تصاویر
        <br />
        حداکثر حجم فایل: 50MB
      </p>

      {file && (
        <div className="mt-5 rounded-xl bg-gray-50 p-4">
          <p className="text-sm font-medium">فایل انتخاب‌شده:</p>

          <p className="mt-1 break-all text-sm text-gray-500">{file.name}</p>

          <p className="mt-2 text-xs text-gray-400">
            حجم: {(file.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          ❌ {error}
        </div>
      )}

      {message && (
        <div className="mt-5 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
          ✅ {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !file}
        className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "در حال آپلود..." : "افزودن فایل"}
      </button>
    </form>
  );
}
