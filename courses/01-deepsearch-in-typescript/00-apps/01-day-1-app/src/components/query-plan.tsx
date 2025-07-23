import { SearchIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface QueryPlanProps {
  plan: string;
  queries: string[];
}

export const QueryPlan = ({ plan, queries }: QueryPlanProps) => {
  return (
    <div className="mb-4 w-full">
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Research Plan</h4>
          <div className="text-sm text-gray-400">
            <ReactMarkdown>{plan}</ReactMarkdown>
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Search Queries</h4>
          <div className="space-y-2">
            {queries.map((query, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-400">
                <SearchIcon className="size-4 flex-shrink-0" />
                <span className="flex-1">{query}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 