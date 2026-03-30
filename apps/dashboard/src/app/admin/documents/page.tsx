"use client";

import { useEffect, useState, useRef } from "react";
import { fetchDocuments, uploadDocument, deleteDocument } from "@/lib/admin-api";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "certificate", label: "Certificates" },
  { value: "survey", label: "Surveys" },
  { value: "crew_doc", label: "Crew Docs" },
  { value: "plan", label: "Plans" },
  { value: "other", label: "Other" },
];

const DOC_TYPES = [
  "coi", "stability_letter", "fcc_license", "abs_certificate",
  "medical_cert", "license_scan", "training_cert", "photo_id",
  "twic", "safety_plan", "sms_manual", "survey_report", "other",
];

export default function DocumentVaultPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [summary, setSummary] = useState({ current: 0, expiring: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [toast, setToast] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Upload form state
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    doc_type: "other",
    category: "other",
    expiry_date: "",
    crew_profile_id: "",
    notes: "",
  });
  const [uploading, setUploading] = useState(false);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await fetchDocuments({
        category: activeCategory !== "all" ? activeCategory : undefined,
        search: search || undefined,
      });
      setDocuments(data.documents);
      setSummary(data.summary);
    } catch {
      setDocuments([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, [activeCategory]);

  useEffect(() => {
    const timer = setTimeout(() => loadDocs(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const showToast = (msg: string, duration = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(""), duration);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      showToast("Please select a file");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("doc_type", uploadForm.doc_type);
      formData.append("category", uploadForm.category);
      if (uploadForm.expiry_date) formData.append("expiry_date", uploadForm.expiry_date);
      if (uploadForm.crew_profile_id) formData.append("crew_profile_id", uploadForm.crew_profile_id);
      if (uploadForm.notes) formData.append("notes", uploadForm.notes);

      await uploadDocument(formData);
      showToast("Document uploaded");
      setShowUpload(false);
      setUploadFile(null);
      setUploadForm({ doc_type: "other", category: "other", expiry_date: "", crew_profile_id: "", notes: "" });
      await loadDocs();
    } catch (err) {
      showToast(`Error: ${(err as Error).message}`, 5000);
    }
    setUploading(false);
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteDocument(docId);
      showToast("Document deleted");
      setDeleteConfirm(null);
      await loadDocs();
    } catch (err) {
      showToast(`Error: ${(err as Error).message}`, 5000);
    }
  };

  const fileIcon = (mimeType: string | null) => {
    if (mimeType?.includes("pdf")) return "PDF";
    if (mimeType?.includes("image")) return "IMG";
    return "DOC";
  };

  const now = new Date();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-text">Document Vault</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-status-blue hover:bg-status-blue/80 text-white rounded-lg px-4 py-2.5 min-h-[48px] font-medium text-sm flex items-center gap-2 transition-colors"
        >
          + Upload
        </button>
      </div>

      {/* Expiry Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-navy-surface border border-navy-border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-status-green">{summary.current}</div>
          <div className="text-xs text-slate-muted mt-1">Current</div>
        </div>
        <div className="bg-navy-surface border border-navy-border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-status-amber">{summary.expiring}</div>
          <div className="text-xs text-slate-muted mt-1">Expiring</div>
        </div>
        <div className="bg-navy-surface border border-navy-border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-status-red">{summary.expired}</div>
          <div className="text-xs text-slate-muted mt-1">Expired</div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[40px] ${
              activeCategory === cat.value
                ? "bg-status-blue/20 text-status-blue"
                : "text-slate-muted hover:text-slate-text hover:bg-navy-surface"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search documents..."
        className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text min-h-[48px] focus:border-status-blue focus:ring-1 focus:ring-status-blue"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Document Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-slate-muted/30 border-t-slate-muted rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center text-slate-muted py-12 bg-navy-surface border border-navy-border rounded-xl">
          No documents found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documents.map((doc) => {
            const daysLeft = doc.daysUntilExpiry;
            return (
              <div
                key={doc.id}
                className="bg-navy-surface border border-navy-border rounded-xl p-4 hover:border-status-blue/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-navy border border-navy-border flex items-center justify-center text-xs font-bold text-slate-muted flex-shrink-0">
                    {fileIcon(doc.mimeType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-text truncate">
                      {doc.filename}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-blue/20 text-status-blue">
                        {doc.category || "other"}
                      </span>
                      <span className="text-xs text-slate-muted">{doc.docType}</span>
                    </div>
                    {doc.expiryDate && (
                      <div className="mt-2">
                        <ExpiryBadge days={daysLeft} />
                      </div>
                    )}
                    <div className="text-xs text-slate-muted mt-2">
                      {doc.uploadedAt
                        ? new Date(doc.uploadedAt).toLocaleDateString()
                        : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteConfirm(doc.id)}
                    className="text-slate-muted hover:text-status-red transition-colors p-1"
                    title="Delete"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-surface border border-navy-border rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-text mb-4">Upload Document</h3>

            <div className="space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm text-slate-muted mb-1">File</label>
                <input
                  ref={fileRef}
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text min-h-[48px] file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-status-blue/20 file:text-status-blue"
                />
                {uploadFile && (
                  <p className="text-xs text-slate-muted mt-1">{uploadFile.name}</p>
                )}
              </div>

              {/* Doc Type */}
              <div>
                <label className="block text-sm text-slate-muted mb-1">Document Type</label>
                <select
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text min-h-[48px]"
                  value={uploadForm.doc_type}
                  onChange={(e) => setUploadForm((p) => ({ ...p, doc_type: e.target.value }))}
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm text-slate-muted mb-1">Category</label>
                <select
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text min-h-[48px]"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm((p) => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm text-slate-muted mb-1">
                  Expiry Date (optional)
                </label>
                <input
                  type="date"
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text min-h-[48px]"
                  value={uploadForm.expiry_date}
                  onChange={(e) =>
                    setUploadForm((p) => ({ ...p, expiry_date: e.target.value }))
                  }
                />
              </div>

              {/* Crew Member Link */}
              <div>
                <label className="block text-sm text-slate-muted mb-1">
                  Crew Member ID (optional)
                </label>
                <input
                  type="text"
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text min-h-[48px]"
                  value={uploadForm.crew_profile_id}
                  onChange={(e) =>
                    setUploadForm((p) => ({ ...p, crew_profile_id: e.target.value }))
                  }
                  placeholder="UUID of crew member (if crew doc)"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-slate-muted mb-1">Notes</label>
                <textarea
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text min-h-[80px] resize-none"
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes about this document"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUpload(false);
                  setUploadFile(null);
                }}
                className="flex-1 bg-navy border border-navy-border text-slate-text rounded-lg px-4 py-3 min-h-[48px] font-medium transition-colors hover:border-slate-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
                className="flex-1 bg-status-blue hover:bg-status-blue/80 text-white rounded-lg px-4 py-3 min-h-[48px] font-medium transition-colors disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-surface border border-navy-border rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-text mb-2">Delete Document</h3>
            <p className="text-sm text-slate-muted mb-4">
              Are you sure you want to delete this document? It can be recovered by an administrator.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-navy border border-navy-border text-slate-text rounded-lg px-4 py-3 min-h-[48px] font-medium transition-colors hover:border-slate-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-status-red hover:bg-status-red/80 text-white rounded-lg px-4 py-3 min-h-[48px] font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-navy-surface border border-navy-border rounded-lg px-4 py-2 text-sm text-slate-text shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return null;

  let colorClass: string;
  let label: string;
  if (days < 0) {
    colorClass = "bg-status-red/20 text-status-red";
    label = `${Math.abs(days)}d overdue`;
  } else if (days <= 30) {
    colorClass = "bg-status-red/20 text-status-red";
    label = `${days}d remaining`;
  } else if (days <= 90) {
    colorClass = "bg-status-amber/20 text-status-amber";
    label = `${days}d remaining`;
  } else {
    colorClass = "bg-status-green/20 text-status-green";
    label = `${days}d remaining`;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
