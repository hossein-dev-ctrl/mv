"use client";

import { useState } from "react";

import LessonVideo from "@/components/course/lesson-video";
import CompleteLessonButton from "@/components/course/complete-lesson-button";

type Props = {
  lessonId: string;
  videoUrl: string | null;
  isCompleted: boolean;
  hasCompletedVideo: boolean;
};

export default function LessonContent({
  lessonId,
  videoUrl,
  isCompleted,
  hasCompletedVideo,
}: Props) {
  const [watchedThisVisit, setWatchedThisVisit] = useState(false);
  const videoCompleted = !videoUrl || hasCompletedVideo || watchedThisVisit;

  return (
    <div>
      {videoUrl ? (
        <LessonVideo
          lessonId={lessonId}
          videoUrl={videoUrl}
          hasCompletedVideo={hasCompletedVideo}
          disabled={isCompleted}
          onVideoCompleted={() => setWatchedThisVisit(true)}
        />
      ) : (
        <div className="rounded-xl bg-gray-100 p-12 text-center text-gray-500">
          ویدئویی برای این درس ثبت نشده است.
        </div>
      )}

      <div className="mt-8 border-t pt-6">
        {isCompleted ? (
          <div className="rounded-xl bg-green-50 p-4 font-medium text-green-700">
            ✅ این درس را تکمیل کرده‌اید.
          </div>
        ) : (
          <CompleteLessonButton
            lessonId={lessonId}
            videoCompleted={videoCompleted}
          />
        )}
      </div>
    </div>
  );
}
