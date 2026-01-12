"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

interface UserProfile {
  id: string;
  email: string;
  linkedin: {
    name: string;
    picture: string | null;
  } | null;
}

interface ArticleData {
  id: string;
  runId: string;
  articleType: string;
  title: string;
  subtitle: string | null;
  introduction: string;
  sections: string[];
  conclusion: string;
  fullText: string;
  versionNumber: number | null;
  approved: boolean;
  scheduledAt: string | null;
  imageIntent: {
    id: string;
    headlineText: string;
    prompt: string;
    generatedImageUrl: string | null;
  } | null;
}

export default function ArticleEditPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = use(params);
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  // Article state
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [conclusion, setConclusion] = useState("");

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Schedule state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [isScheduling, setIsScheduling] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setUserProfile(data);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    };
    loadProfile();
  }, []);

  // Load article
  useEffect(() => {
    const loadArticle = async () => {
      try {
        const res = await fetch(`/api/articles/${articleId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Article not found");
          } else {
            setError("Failed to load article");
          }
          return;
        }

        const data: ArticleData = await res.json();
        setArticle(data);
        setTitle(data.title);
        setSubtitle(data.subtitle || "");
        setIntroduction(data.introduction);
        setSections(data.sections);
        setConclusion(data.conclusion);
        setIsScheduled(!!data.scheduledAt);
        setScheduledAt(data.scheduledAt);
      } catch (err) {
        console.error("Load article error:", err);
        setError("Failed to load article");
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [articleId]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      // Build the full text from parts (sections already contain their own headings)
      const fullText = [
        `# ${title}`,
        subtitle ? `*${subtitle}*` : "",
        "",
        introduction,
        "",
        ...sections.filter(Boolean),
        "",
        conclusion,
      ].filter(Boolean).join("\n\n");

      const res = await fetch(`/api/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          introduction: introduction.trim(),
          sections,
          conclusion: conclusion.trim(),
          fullText,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setSuccessMessage("Article saved");
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save article");
    } finally {
      setIsSaving(false);
    }
  }, [articleId, title, subtitle, introduction, sections, conclusion]);

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) return;

    // Save any pending changes first
    await handleSave();

    setIsScheduling(true);
    setError(null);

    try {
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);

      const res = await fetch(`/api/articles/${articleId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledDateTime.toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to schedule");
        return;
      }

      setIsScheduled(true);
      setScheduledAt(scheduledDateTime.toISOString());
      setShowScheduleModal(false);
      setSuccessMessage("Article scheduled!");
    } catch (err) {
      console.error("Schedule error:", err);
      setError("Failed to schedule article");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleUnschedule = async () => {
    setIsScheduling(true);
    setError(null);

    try {
      const res = await fetch(`/api/articles/${articleId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: null }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to unschedule");
        return;
      }

      setIsScheduled(false);
      setScheduledAt(null);
      setSuccessMessage("Article unscheduled");
    } catch (err) {
      console.error("Unschedule error:", err);
      setError("Failed to unschedule article");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete");
        return;
      }

      // Redirect to dashboard after successful delete
      router.push("/dashboard");
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete article");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getDefaultScheduleDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const handleSectionChange = (index: number, value: string) => {
    const newSections = [...sections];
    newSections[index] = value;
    setSections(newSections);
  };

  const addSection = () => {
    setSections([...sections, ""]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (error && !article) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              {error}
            </h1>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-blue-600 hover:underline"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const userName = userProfile?.linkedin?.name || "Your Name";
  const userPicture = userProfile?.linkedin?.picture;
  const coverImageUrl = article?.imageIntent?.generatedImageUrl;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-xs font-semibold uppercase bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded">
                  Article
                </span>
                <span className="text-xs text-zinc-500 capitalize">
                  {article?.articleType?.replace("_", " ")}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Edit Article
              </h1>
              {isScheduled && scheduledAt && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-emerald-600 dark:text-emerald-400 text-sm">
                    Scheduled for {new Date(scheduledAt).toLocaleString()}
                  </p>
                  <button
                    onClick={handleUnschedule}
                    disabled={isScheduling}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline"
                  >
                    {isScheduling ? "..." : "Unschedule"}
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete article"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving || !title.trim()}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>

              {!isScheduled && (
                <button
                  onClick={() => {
                    setScheduleDate(getDefaultScheduleDate());
                    setShowScheduleModal(true);
                  }}
                  disabled={!title.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Schedule
                </button>
              )}

              <button
                onClick={() => router.push(`/results/${article?.runId}`)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                View Run
              </button>
            </div>
          </div>

          {/* Messages */}
          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {successMessage}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            </div>
          )}

          {/* Cover Image */}
          {coverImageUrl && (
            <div className="mb-6 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <img
                src={coverImageUrl}
                alt="Article cover"
                className="w-full aspect-[2/1] object-cover"
              />
            </div>
          )}

          {/* Tab Bar */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-700 mb-0">
            <button
              onClick={() => setActiveTab("write")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "write"
                  ? "border-purple-600 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Write
              </span>
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "preview"
                  ? "border-purple-600 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </span>
            </button>
          </div>

          {/* Editor / Preview Content */}
          {activeTab === "write" ? (
            <div className="bg-white dark:bg-zinc-900 rounded-b-xl border border-t-0 border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Article title..."
                  className="w-full px-4 py-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Subtitle (optional)
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="A brief tagline..."
                  className="w-full px-4 py-2 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Introduction */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Introduction
                </label>
                <textarea
                  value={introduction}
                  onChange={(e) => setIntroduction(e.target.value)}
                  placeholder="Set the stage for your article..."
                  rows={4}
                  className="w-full px-4 py-3 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Sections */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Sections
                  </label>
                  <button
                    onClick={addSection}
                    className="text-xs text-purple-600 hover:text-purple-500 font-medium"
                  >
                    + Add Section
                  </button>
                </div>
                <div className="space-y-4">
                  {sections.map((section, index) => (
                    <div key={index} className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-zinc-500">
                          Section {index + 1}
                        </span>
                        {sections.length > 1 && (
                          <button
                            onClick={() => removeSection(index)}
                            className="text-xs text-red-500 hover:text-red-400"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <textarea
                        value={section}
                        onChange={(e) => handleSectionChange(index, e.target.value)}
                        placeholder={`Section ${index + 1} content...`}
                        rows={4}
                        className="w-full px-4 py-3 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Conclusion */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Conclusion
                </label>
                <textarea
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  placeholder="Wrap up your article..."
                  rows={4}
                  className="w-full px-4 py-3 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-b-xl border border-t-0 border-zinc-200 dark:border-zinc-800 p-6">
              {/* Preview */}
              <article className="prose prose-zinc dark:prose-invert max-w-none">
                {/* Author */}
                <div className="flex items-center gap-3 mb-6 not-prose">
                  {userPicture ? (
                    <Image
                      src={userPicture}
                      alt={userName}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {userName}
                    </p>
                    <p className="text-xs text-zinc-500">Just now</p>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold mb-2">{title || "Untitled Article"}</h1>

                {/* Subtitle */}
                {subtitle && (
                  <p className="text-xl text-zinc-500 dark:text-zinc-400 italic mb-6">
                    {subtitle}
                  </p>
                )}

                {/* Introduction */}
                {introduction && (
                  <div className="mb-6 prose prose-zinc dark:prose-invert max-w-none">
                    <ReactMarkdown>{introduction}</ReactMarkdown>
                  </div>
                )}

                {/* Sections */}
                {sections.map((section, index) => (
                  section && (
                    <div key={index} className="mb-6 prose prose-zinc dark:prose-invert max-w-none">
                      <ReactMarkdown>{section}</ReactMarkdown>
                    </div>
                  )
                ))}

                {/* Conclusion */}
                {conclusion && (
                  <div className="mb-6 prose prose-zinc dark:prose-invert max-w-none">
                    <ReactMarkdown>{conclusion}</ReactMarkdown>
                  </div>
                )}
              </article>
            </div>
          )}
        </div>
      </main>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Schedule Article
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                disabled={isScheduling || !scheduleDate}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
              >
                {isScheduling ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Delete Article?
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              This action cannot be undone. The article and any associated images will be permanently deleted.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
