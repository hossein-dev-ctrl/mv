"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  courseId: string;
  sectionId: string;
};

export default function CreateLessonForm({ courseId, sectionId }: Props) {
  const router = useRouter();

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
        `/api/teacher/sections/${sectionId}/lessons`,
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
        throw new Error(result.message || "ایجاد درس ناموفق بود.");
      }

      setTitle("");
      setDescription("");

      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-white p-6 shadow-sm"
    >
      <h2 className="mb-5 text-xl font-bold">➕ ایجاد درس جدید</h2>

      <div className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="عنوان درس"
          required
          className="w-full rounded-xl border px-4 py-3 outline-none focus:border-indigo-500"
        />

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="توضیحات اولیه درس"
          rows={4}
          className="w-full rounded-xl border px-4 py-3 outline-none focus:border-indigo-500"
        />

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
            ❌ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "در حال ایجاد..." : "ایجاد درس"}
        </button>
      </div>
    </form>
  );
}
