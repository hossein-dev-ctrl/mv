"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Course = {
  id: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  roadmapImageUrl: string | null;
  price: number;
};

type Props = {
  course: Course;
};

export default function EditCourseForm({ course }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(course.title);

  const [shortDescription, setShortDescription] = useState(
    course.shortDescription ?? "",
  );

  const [description, setDescription] = useState(course.description ?? "");

  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnailUrl ?? "");

  const [roadmapImageUrl, setRoadmapImageUrl] = useState(
    course.roadmapImageUrl ?? "",
  );

  const [price, setPrice] = useState(String(course.price));

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/teacher/courses/${course.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          shortDescription,
          description,
          thumbnailUrl,
          roadmapImageUrl,
          price: Number(price),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "ذخیره تغییرات ناموفق بود.");
      }

      setSuccess("تغییرات با موفقیت ذخیره شد.");

      setTimeout(() => {
        router.push(`/teacher/courses/${course.id}`);
      }, 800);
      // router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm"
    >
      {/* عنوان */}

      <div>
        <label className="mb-2 block text-sm font-medium">عنوان دوره</label>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="w-full rounded-xl border px-4 py-3 outline-none focus:border-indigo-500"
          placeholder="مثلاً آموزش Scratch Junior"
        />
      </div>

      {/* توضیح کوتاه */}

      <div>
        <label className="mb-2 block text-sm font-medium">توضیح کوتاه</label>

        <textarea
          value={shortDescription}
          onChange={(event) => setShortDescription(event.target.value)}
          rows={3}
          className="w-full rounded-xl border px-4 py-3 outline-none focus:border-indigo-500"
          placeholder="یک توضیح کوتاه درباره دوره..."
        />
      </div>

      {/* توضیحات */}

      <div>
        <label className="mb-2 block text-sm font-medium">
          توضیحات کامل دوره
        </label>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={8}
          className="w-full rounded-xl border px-4 py-3 outline-none focus:border-indigo-500"
          placeholder="توضیحات کامل دوره..."
        />
      </div>

      {/* قیمت */}

      <div>
        <label className="mb-2 block text-sm font-medium">قیمت دوره</label>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="w-full rounded-xl border px-4 py-3 outline-none focus:border-indigo-500"
          />

          <span className="text-sm text-gray-500">تومان</span>
        </div>
      </div>

      {/* تصویر دوره */}

      <div>
        <label className="mb-2 block text-sm font-medium">
          آدرس تصویر دوره
        </label>

        <input
          value={thumbnailUrl}
          onChange={(event) => setThumbnailUrl(event.target.value)}
          className="w-full rounded-xl border px-4 py-3 outline-none focus:border-indigo-500"
          placeholder="/uploads/courses/course.jpg"
        />

        {thumbnailUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border">
            <img
              src={thumbnailUrl}
              alt="تصویر دوره"
              className="max-h-64 w-full object-cover"
            />
          </div>
        )}
      </div>

      {/* نقشه راه */}

      <div>
        <label className="mb-2 block text-sm font-medium">
          آدرس تصویر نقشه راه
        </label>

        <input
          value={roadmapImageUrl}
          onChange={(event) => setRoadmapImageUrl(event.target.value)}
          className="w-full rounded-xl border px-4 py-3 outline-none focus:border-indigo-500"
          placeholder="/uploads/roadmaps/course-roadmap.jpg"
        />

        {roadmapImageUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border">
            <img
              src={roadmapImageUrl}
              alt="نقشه راه دوره"
              className="max-h-96 w-full object-contain"
            />
          </div>
        )}
      </div>

      {/* خطا */}

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          ❌ {error}
        </div>
      )}

      {/* موفقیت */}

      {success && (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-600">
          ✅ {success}
        </div>
      )}

      {/* دکمه */}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "در حال ذخیره..." : "💾 ذخیره تغییرات"}
      </button>
    </form>
  );
}
