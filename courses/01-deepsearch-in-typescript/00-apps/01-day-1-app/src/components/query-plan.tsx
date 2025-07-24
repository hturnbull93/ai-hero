import { SearchIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface QueryPlanProps {
  plan: string;
  queries: string[];
}

export const QueryPlan = ({ plan, queries }: QueryPlanProps) => {
  return (
    <>
      <h4 className="mb-2 text-sm font-semibold text-gray-300">
        Research Plan
      </h4>
      <div className="mb-2 text-sm text-gray-400">
        <ReactMarkdown>{plan}</ReactMarkdown>
      </div>

      <h4 className="mb-2 text-sm font-semibold text-gray-300">
        Search Queries
      </h4>
      <div className="space-y-2">
        {queries.map((query, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-sm text-gray-400"
          >
            <SearchIcon className="size-4 flex-shrink-0" />
            <span className="flex-1">{query}</span>
          </div>
        ))}
      </div>
    </>
  );
};
