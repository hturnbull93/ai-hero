import type { SearchSource } from "~/types";
import { ExternalLink } from "lucide-react";

interface SearchSourcesProps {
  sources: SearchSource[];
}

export function SearchSources({ sources }: SearchSourcesProps) {
  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sources.map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-lg border border-gray-700 bg-gray-800 p-4 transition-colors hover:border-gray-600 hover:bg-gray-750"
          >
            <div className="flex items-start gap-3">
              {source.favicon && (
                <img
                  src={source.favicon}
                  alt=""
                  className="size-4 flex-shrink-0 rounded"
                  onError={(e) => {
                    // Hide the image if it fails to load
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h5 className="text-sm font-medium text-gray-200 line-clamp-2 group-hover:text-blue-400">
                    {source.title}
                  </h5>
                  <ExternalLink className="size-3 flex-shrink-0 text-gray-500 group-hover:text-blue-400" />
                </div>
                <p className="mt-1 text-xs text-gray-400 line-clamp-3">
                  {source.snippet}
                </p>
                <p className="mt-2 text-xs text-gray-500 truncate">
                  {getHostname(source.url)}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
  );
} 