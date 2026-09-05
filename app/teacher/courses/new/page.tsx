"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCoursePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);

    const data = {
      title: form.get("title"),
      slug: form.get("slug"),
      shortDescription: form.get("shortDescription"),
      description: form.get("description"),
      price: Number(form.get("price") || 0),
      thumbnailUrl: form.get("thumbnailUrl") || null,
      roadmapImageUrl: form.get("roadmapImageUrl") || null,
    };

    try {
      const response = await fetch("/api/teacher/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "خطا در ایجاد دوره");
      }

      router.push(`/teacher/courses/${result.course.id}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "خطایی رخ داد");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50" dir="rtl">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">ایجاد دوره جدید</h1>

          <p className="mt-2 text-slate-500">اطلاعات اصلی دوره را وارد کنید.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* اطلاعات اصلی */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-6 text-lg font-bold">اطلاعات اصلی دوره</h2>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  عنوان دوره
                </label>

                <input
                  name="title"
                  required
                  placeholder="مثلاً: آموزش Scratch Junior سطح ۱"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Slug</label>

                <input
                  name="slug"
                  required
                  placeholder="scratch-junior-level-1"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
                />

                <p className="mt-2 text-xs text-slate-400">
                  برای آدرس صفحه دوره استفاده می‌شود.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  توضیح کوتاه
                </label>

                <input
                  name="shortDescription"
                  placeholder="یک توضیح کوتاه درباره دوره"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  توضیحات کامل دوره
                </label>

                <textarea
                  name="description"
                  rows={8}
                  placeholder="توضیحات کامل دوره..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </section>

          {/* تصویر */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-6 text-lg font-bold">تصاویر دوره</h2>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  آدرس تصویر دوره
                </label>

                <input
                  name="thumbnailUrl"
                  placeholder="https://..."
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  🗺️ آدرس تصویر نقشه راه
                </label>

                <input
                  name="roadmapImageUrl"
                  placeholder="https://..."
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
                />

                <p className="mt-2 text-xs text-slate-400">
                  آپلود واقعی تصویر را در مرحله Storage اضافه می‌کنیم.
                </p>
              </div>
            </div>
          </section>

          {/* قیمت */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-6 text-lg font-bold">قیمت دوره</h2>

            <div>
              <label className="mb-2 block text-sm font-medium">
                قیمت به تومان
              </label>

              <input
                name="price"
                type="number"
                min="0"
                defaultValue="0"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>
          </section>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-medium hover:bg-slate-50"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "در حال ذخیره..." : "ایجاد دوره"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
