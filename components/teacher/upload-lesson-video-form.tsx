"use client";

import { ChangeEvent, FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

type Props = {
  lessonId: string;
  currentVideoUrl: string | null;
  currentDuration: number | null;
};

export default function UploadLessonVideoForm({
  lessonId,
  currentVideoUrl,
  currentDuration,
}: Props) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);

  const [duration, setDuration] = useState<number | null>(currentDuration);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(currentVideoUrl);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setError("");
    setMessage("");
    setFile(selectedFile);

    const objectUrl = URL.createObjectURL(selectedFile);

    setPreviewUrl(objectUrl);

    const video = document.createElement("video");

    video.preload = "metadata";

    video.onloadedmetadata = () => {
      const videoDuration = Math.round(video.duration);

      setDuration(videoDuration);

      URL.revokeObjectURL(objectUrl);
    };

    video.src = objectUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("ابتدا یک فایل ویدئو انتخاب کنید.");

      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();

      formData.append("video", file);

      if (duration !== null) {
        formData.append("duration", String(duration));
      }

      const response = await fetch(`/api/teacher/lessons/${lessonId}/video`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "آپلود ویدئو ناموفق بود.");
      }

      setMessage("ویدئو با موفقیت آپلود شد.");

      setFile(null);

      if (result.lesson?.videoUrl) {
        setPreviewUrl(result.lesson.videoUrl);
      }

      if (typeof result.lesson?.videoDuration === "number") {
        setDuration(result.lesson.videoDuration);
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "خطایی هنگام آپلود رخ داد.",
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(seconds: number | null) {
    if (seconds === null || !Number.isFinite(seconds)) {
      return "ثبت نشده";
    }

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold">🎬 ویدئوی درس</h2>

        <p className="mt-1 text-sm text-gray-500">
          ویدئوی آموزشی این درس را انتخاب و آپلود کنید.
        </p>
      </div>

      {/* Current Video */}
      {previewUrl && (
        <div className="mb-6">
          <video
            key={previewUrl}
            controls
            className="w-full rounded-xl bg-black"
            src={previewUrl}
          />
        </div>
      )}

      {/* File Input */}
      <div>
        <label
          htmlFor="lesson-video"
          className="mb-2 block text-sm font-medium"
        >
          انتخاب ویدئو
        </label>

        <input
          id="lesson-video"
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
          className="block w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm"
        />

        <p className="mt-2 text-xs text-gray-400">
          فرمت‌های مجاز: MP4، WebM، MOV
          <br />
          حداکثر حجم: 500MB
        </p>
      </div>

      {/* Selected File */}
      {file && (
        <div className="mt-5 rounded-xl bg-gray-50 p-4">
          <p className="text-sm font-medium">فایل انتخاب‌شده:</p>

          <p className="mt-1 break-all text-sm text-gray-500">{file.name}</p>

          <p className="mt-2 text-xs text-gray-400">
            حجم: {(file.size / (1024 * 1024)).toFixed(2)} MB
          </p>

          <p className="mt-1 text-xs text-gray-400">
            مدت: {formatDuration(duration)}
          </p>
        </div>
      )}

      {/* Duration */}
      <div className="mt-5">
        <label className="mb-2 block text-sm font-medium">مدت ویدئو</label>

        <div className="rounded-xl border bg-gray-50 px-4 py-3">
          {formatDuration(duration)}
        </div>

        <p className="mt-2 text-xs text-gray-400">
          مدت ویدئو به صورت خودکار از فایل استخراج می‌شود.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          ❌ {error}
        </div>
      )}

      {/* Success */}
      {message && (
        <div className="mt-5 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
          ✅ {message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !file}
        className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "در حال آپلود ویدئو..." : "آپلود ویدئو"}
      </button>
    </form>
  );
}
