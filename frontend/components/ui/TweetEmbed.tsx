"use client";

import { useEffect, useRef, useState } from "react";

interface TweetEmbedProps {
  tweetUrl: string;
  tweetId: string;
}

/**
 * Renders a Twitter/X embed using the official blockquote + widgets.js pattern.
 * Re-processes embeds when the tweetId changes (e.g. when scrolling through cards).
 */
export default function TweetEmbed({ tweetUrl, tweetId }: TweetEmbedProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Intersection observer to only load when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" } // Load a bit before it comes into view
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isVisible || !ref.current) return;

    // Clear prev contents if remounting with a new tweetId (or Strict Mode double trigger)
    ref.current.innerHTML = "";
    setIsLoading(true);

    const renderTweet = () => {
      const win = window as any;
      if (win.twttr?.widgets?.createTweet && ref.current) {
        win.twttr.widgets.createTweet(tweetId, ref.current, {
          conversation: "none",
          dnt: true,
          theme: "light",
          width: 280,
          align: "center",
        }).then(() => {
          setIsLoading(false);
        });
      }
    };

    const win = window as any;
    if (win.twttr?.widgets?.createTweet) {
      renderTweet();
    } else {
      if (!document.querySelector('script[src*="platform.twitter.com"]')) {
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://platform.twitter.com/widgets.js";
        script.charset = "utf-8";
        script.onload = () => renderTweet();
        document.body.appendChild(script);
      } else {
        // Script added but not executed yet
        const interval = window.setInterval(() => {
          if ((window as any).twttr?.widgets?.createTweet) {
            window.clearInterval(interval);
            renderTweet();
          }
        }, 200);
      }
    }
  }, [tweetId, isVisible]);

  return (
    <div className="relative min-h-[150px] w-full">
      {(!isVisible || isLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-paper-bright">
          <div className="h-6 w-6 border-2 border-paper-border border-t-ink-muted rounded-full animate-spin"></div>
        </div>
      )}
      <div 
        ref={ref} 
        dir="ltr"
        className="tweet-embed-container w-full overflow-hidden bg-paper-bright"
        style={{ maxWidth: "100%", opacity: (!isVisible || isLoading) ? 0 : 1, transition: "opacity 0.3s" }}
      />
    </div>
  );
}
