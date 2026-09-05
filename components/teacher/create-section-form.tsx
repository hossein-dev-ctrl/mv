"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  courseId: string;
};

export default function CreateSectionForm({ courseId }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/teacher/courses/${courseId}/sections`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            description,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "خطا در ایجاد فصل");
      }

      setTitle("");
      setDescription("");
      setOpen(false);

      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "خطایی رخ داد");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700"
      >
        + افزودن فصل
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-indigo-100 bg-indigo-50 p-5"
    >
      <h3 className="mb-4 font-bold">ایجاد فصل جدید</h3>

      <div className="space-y-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="عنوان فصل"
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500"
        />

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="توضیح فصل (اختیاری)"
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500"
        />

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "در حال ایجاد..." : "ایجاد فصل"}
          </button>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm"
          >
            انصراف
          </button>
        </div>
      </div>
    </form>
  );
}
