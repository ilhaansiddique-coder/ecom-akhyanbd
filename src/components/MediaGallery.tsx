"use client";

import { useState, useEffect } from "react";
import { FiX, FiUploadCloud, FiCheck, FiImage, FiVideo, FiLink, FiTrash2 } from "react-icons/fi";
import { SafeImg } from "./SafeImage";
import { api } from "@/lib/api";
import Modal from "./Modal";

interface MediaItem {
  filename: string;
  url: string;
  size: number;
  type: "image" | "video";
  modified: string;
}

interface MediaGalleryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, type: "image" | "video" | "embed") => void;
  mediaType?: "all" | "image" | "video";
}

export default function MediaGallery({ open, onClose, onSelect, mediaType = "all" }: MediaGalleryProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"gallery" | "upload" | "url">("gallery");
  const [externalUrl, setExternalUrl] = useState("");
  const [filter, setFilter] = useState<"all" | "image" | "video">(mediaType === "all" ? "all" : mediaType);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/v1/admin/media", { credentials: "include", headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => setMedia(Array.isArray(data) ? data : []))
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }, [open]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await api.admin.upload(file);
      const url = res.url || res.path;
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isVideo = ["mp4", "webm", "mov", "avi", "mkv"].includes(ext);
      onSelect(url, isVideo ? "video" : "image");
      onClose();
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleExternalUrl = () => {
    if (!externalUrl.trim()) return;
    const url = externalUrl.trim();
    const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
    const isVideo = isYoutube || url.match(/\.(mp4|webm|mov)$/i);
    onSelect(url, isYoutube ? "embed" : isVideo ? "video" : "image");
    onClose();
  };

  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${item.filename}"?`)) return;
    setDeleting(item.filename);
    try {
      await fetch("/api/v1/admin/media", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: item.filename }),
      });
      setMedia((prev) => prev.filter((m) => m.filename !== item.filename));
    } catch {
      alert("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = filter === "all" ? media : media.filter((m) => m.type === filter);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  };

  return (
    <Modal open={open} onClose={onClose} title="Media Gallery" size="xl">
      <div className="p-5">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { id: "gallery" as const, label: "Gallery", icon: <FiImage className="w-3.5 h-3.5" /> },
            { id: "upload" as const, label: "Upload", icon: <FiUploadCloud className="w-3.5 h-3.5" /> },
            { id: "url" as const, label: "External URL", icon: <FiLink className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? "bg-[#0f5931] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Gallery Tab */}
        {tab === "gallery" && (
          <>
            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {["all", "image", "video"].map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f as typeof filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === f ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                  {f === "all" ? "All" : f === "image" ? "Images" : "Videos"}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No media found</div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto">
                {filtered.map((item) => (
                  <button key={item.filename} type="button"
                    onClick={() => { onSelect(item.url, item.type); onClose(); }}
                    className="group relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-[#0f5931] transition-colors bg-gray-50">
                    {item.type === "video" ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-white">
                        <FiVideo className="w-8 h-8 mb-2" />
                        <span className="text-[10px] truncate max-w-full px-2">{item.filename}</span>
                      </div>
                    ) : (
                      <SafeImg src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <FiCheck className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(item, e)}
                      disabled={deleting === item.filename}
                      className="absolute top-1.5 right-1.5 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                      title="Delete"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-2 py-1 truncate">
                      {formatSize(item.size)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Upload Tab */}
        {tab === "upload" && (
          <div className="py-8">
            <label className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-[#0f5931] transition-colors">
              <FiUploadCloud className="w-10 h-10 text-gray-300 mb-3" />
              <span className="text-sm text-gray-500 font-medium">
                {uploading ? "Uploading..." : "Click to upload image or video"}
              </span>
              <span className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP, MP4, WEBM (max 50MB)</span>
              <input type="file" accept="image/*,video/*" className="hidden" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
            </label>
          </div>
        )}

        {/* External URL Tab */}
        {tab === "url" && (
          <div className="py-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Paste image or video URL</label>
              <input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none"
                placeholder="https://youtube.com/watch?v=... or https://example.com/image.jpg"
              />
              <p className="text-xs text-gray-400 mt-2">
                Supports: YouTube, direct image/video URLs
              </p>
            </div>

            {/* Preview */}
            {externalUrl && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Preview:</p>
                {externalUrl.includes("youtube.com") || externalUrl.includes("youtu.be") ? (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={externalUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                      className="w-full h-full" allowFullScreen />
                  </div>
                ) : externalUrl.match(/\.(mp4|webm|mov)$/i) ? (
                  <video src={externalUrl} controls className="w-full rounded-lg max-h-48" />
                ) : (
                  <SafeImg src={externalUrl} alt="Preview" className="w-full rounded-lg max-h-48 object-contain" />
                )}
              </div>
            )}

            <button type="button" onClick={handleExternalUrl} disabled={!externalUrl.trim()}
              className="w-full py-3 bg-[#0f5931] text-white rounded-xl font-semibold text-sm hover:bg-[#12693a] transition-colors disabled:opacity-50">
              Use This Media
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
