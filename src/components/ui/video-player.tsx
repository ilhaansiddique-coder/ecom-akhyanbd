"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, Volume1, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/* ───────── helpers ───────── */

const formatTime = (seconds: number) => {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const isYouTube = (url: string) =>
  url.includes("youtube.com") || url.includes("youtu.be");

const extractYouTubeId = (url: string): string | null => {
  // youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const m =
    url.match(/youtu\.be\/([\w-]{6,})/) ||
    url.match(/[?&]v=([\w-]{6,})/) ||
    url.match(/youtube\.com\/embed\/([\w-]{6,})/) ||
    url.match(/youtube\.com\/shorts\/([\w-]{6,})/);
  return m ? m[1] : null;
};

/* ───────── YouTube IFrame API loader (singleton) ───────── */

type YT = {
  Player: new (
    el: HTMLElement | string,
    opts: Record<string, unknown>,
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
};
interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (v: number) => void;
  setPlaybackRate: (r: number) => void;
  seekTo: (s: number, allow: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

let ytApiPromise: Promise<YT> | null = null;
function loadYouTubeApi(): Promise<YT> {
  if (typeof window === "undefined") return Promise.reject("SSR");
  const w = window as unknown as { YT?: YT; onYouTubeIframeAPIReady?: () => void };
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<YT>((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (w.YT) resolve(w.YT);
    };
  });
  return ytApiPromise;
}

/* ───────── slider ───────── */

const CustomSlider = ({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) => {
  return (
    <motion.div
      className={cn(
        "relative w-full h-1 bg-white/20 rounded-full cursor-pointer",
        className,
      )}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        onChange(Math.min(Math.max(percentage, 0), 100));
      }}
    >
      <motion.div
        className="absolute top-0 left-0 h-full bg-white rounded-full"
        style={{ width: `${value}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </motion.div>
  );
};

/* ───────── component ───────── */

interface VideoPlayerProps {
  src: string;
  /** Auto-play on mount. Browsers require muted autoplay, so this also starts muted. */
  autoPlay?: boolean;
  /** Loop playback. */
  loop?: boolean;
  /** Poster image shown before the video starts (native videos only). */
  poster?: string;
  className?: string;
}

const VideoPlayer = ({
  src,
  autoPlay = false,
  loop = false,
  poster,
  className,
}: VideoPlayerProps) => {
  const isYt = isYouTube(src);
  const ytId = isYt ? extractYouTubeId(src) : null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const ytHostRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(autoPlay ? 0 : 1);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(autoPlay);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  /* ── native video autoplay ── */
  useEffect(() => {
    if (isYt) return;
    if (!autoPlay || !videoRef.current) return;
    const v = videoRef.current;
    v.muted = true;
    const p = v.play();
    if (p && typeof p.then === "function") {
      p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(true);
    }
  }, [autoPlay, isYt]);

  /* ── YouTube init ── */
  useEffect(() => {
    if (!isYt || !ytId || !ytHostRef.current) return;
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !ytHostRef.current) return;
      ytPlayerRef.current = new YT.Player(ytHostRef.current, {
        videoId: ytId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          fs: 0,
          iv_load_policy: 3,
          disablekb: 1,
          autoplay: autoPlay ? 1 : 0,
          mute: autoPlay ? 1 : 0,
          loop: loop ? 1 : 0,
          playlist: loop ? ytId : undefined, // loop requires playlist=ID
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            const d = e.target.getDuration();
            setDuration(isFinite(d) ? d : 0);
            if (autoPlay) {
              e.target.mute();
              e.target.playVideo();
            }
          },
          onStateChange: (e: { data: number; target: YTPlayer }) => {
            const s = e.data;
            if (s === YT.PlayerState.PLAYING) setIsPlaying(true);
            else if (s === YT.PlayerState.PAUSED || s === YT.PlayerState.ENDED)
              setIsPlaying(false);
          },
        },
      });

      // YouTube has no timeupdate event — poll.
      pollId = setInterval(() => {
        const p = ytPlayerRef.current;
        if (!p) return;
        try {
          const t = p.getCurrentTime();
          const d = p.getDuration();
          if (isFinite(d) && d > 0) {
            setCurrentTime(t);
            setDuration(d);
            setProgress((t / d) * 100);
          }
        } catch {
          /* not ready */
        }
      }, 250);
    });

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      try {
        ytPlayerRef.current?.destroy();
      } catch {}
      ytPlayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytId]);

  /* ── unified controls ── */

  const togglePlay = useCallback(() => {
    if (isYt) {
      const p = ytPlayerRef.current;
      if (!p) return;
      if (isPlaying) p.pauseVideo();
      else p.playVideo();
    } else if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  }, [isYt, isPlaying]);

  const handleVolumeChange = (value: number) => {
    const newVolume = value / 100;
    if (isYt) {
      const p = ytPlayerRef.current;
      if (!p) return;
      p.setVolume(value);
      if (newVolume === 0) p.mute();
      else p.unMute();
    } else if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(isFinite(p) ? p : 0);
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number) => {
    if (isYt) {
      const p = ytPlayerRef.current;
      if (!p) return;
      const d = p.getDuration();
      if (d > 0) {
        const t = (value / 100) * d;
        p.seekTo(t, true);
        setProgress(value);
      }
    } else if (videoRef.current && videoRef.current.duration) {
      const t = (value / 100) * videoRef.current.duration;
      if (isFinite(t)) {
        videoRef.current.currentTime = t;
        setProgress(value);
      }
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    if (isYt) {
      const p = ytPlayerRef.current;
      if (!p) return;
      if (next) {
        p.mute();
        setVolume(0);
      } else {
        p.unMute();
        p.setVolume(100);
        setVolume(1);
      }
    } else if (videoRef.current) {
      videoRef.current.muted = next;
      if (next) setVolume(0);
      else {
        videoRef.current.volume = 1;
        setVolume(1);
      }
    }
    setIsMuted(next);
  };

  const setSpeed = (speed: number) => {
    if (isYt) {
      ytPlayerRef.current?.setPlaybackRate(speed);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setPlaybackSpeed(speed);
  };

  return (
    <motion.div
      className={cn(
        "relative w-full max-w-4xl mx-auto rounded-xl overflow-hidden bg-[#11111198] shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm",
        className,
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {isYt ? (
        // YouTube IFrame API host. The script replaces this div with an <iframe>.
        // pointer-events-none on the wrapper would block interaction, so we
        // instead overlay a transparent click-catcher to forward play toggles.
        <div className="relative w-full aspect-video">
          <div ref={ytHostRef} className="absolute inset-0 w-full h-full" />
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={togglePlay}
            // bottom strip transparent so controls below stay clickable
            style={{ bottom: showControls ? 96 : 0 }}
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          className="w-full"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
          src={src}
          poster={poster}
          loop={loop}
          playsInline
          onClick={togglePlay}
        />
      )}

      {/* Tap-to-unmute badge — shown whenever video is playing muted (autoplay
          forces mute by browser policy). One click unmutes. */}
      <AnimatePresence>
        {isMuted && isPlaying && (
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-semibold shadow-lg hover:bg-black/85 transition-colors"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <VolumeX className="h-4 w-4" />
            <span>Tap to unmute</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div
            className="absolute bottom-0 mx-auto max-w-xl left-0 right-0 p-2 sm:p-4 m-1.5 sm:m-2 bg-[#11111198] backdrop-blur-md rounded-xl sm:rounded-2xl z-10"
            initial={{ y: 20, opacity: 0, filter: "blur(10px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: 20, opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: "circInOut", type: "spring" }}
          >
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <span className="text-white text-[10px] sm:text-sm">{formatTime(currentTime)}</span>
              <CustomSlider value={progress} onChange={handleSeek} className="flex-1" />
              <span className="text-white text-[10px] sm:text-sm">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 sm:gap-4">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    onClick={togglePlay}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-[#111111d1] hover:text-white h-7 w-7 sm:h-9 sm:w-9"
                  >
                    {isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </Button>
                </motion.div>
                <div className="flex items-center gap-x-1">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      onClick={toggleMute}
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-[#111111d1] hover:text-white h-7 w-7 sm:h-9 sm:w-9"
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : volume > 0.5 ? (
                        <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Volume1 className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </Button>
                  </motion.div>
                  {/* Volume slider hidden on mobile — saves space; mute toggle remains */}
                  <div className="hidden sm:block w-24">
                    <CustomSlider value={volume * 100} onChange={handleVolumeChange} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-2">
                {[0.5, 1, 1.5, 2].map((speed) => (
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} key={speed}>
                    <Button
                      onClick={() => setSpeed(speed)}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "text-white hover:bg-[#111111d1] hover:text-white h-6 w-8 sm:h-9 sm:w-9 text-[10px] sm:text-sm",
                        playbackSpeed === speed && "bg-[#111111d1]",
                      )}
                    >
                      {speed}x
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VideoPlayer;
