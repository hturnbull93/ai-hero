import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { MessageAnnotation } from "~/types";
import { QueryPlan } from "./query-plan";

export const ReasoningSteps = ({
  annotations,
}: {
  annotations: MessageAnnotation[];
}) => {
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set());

  if (annotations.length === 0) return null;

  const toggleStep = (index: number) => {
    setOpenSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="mb-4 w-full">
      <ul className="space-y-1">
        {annotations.map((annotation, index) => {
          const isOpen = openSteps.has(index);
          
          if (annotation.type === "QUERY_PLAN") {
            return (
              <li key={index} className="relative">
                <button
                  onClick={() => toggleStep(index)}
                  className={`min-w-34 flex w-full flex-shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors ${
                    isOpen
                      ? "bg-gray-700 text-gray-200"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                  }`}
                >
                  <span
                    className={`z-10 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold ${
                      isOpen
                        ? "border-green-400 text-white"
                        : "bg-gray-800 text-gray-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  Planning search queries ({annotation.queries.length} queries)
                </button>
                <div className={`${isOpen ? "mt-1" : "hidden"}`}>
                  {isOpen && (
                    <QueryPlan plan={annotation.plan} queries={annotation.queries} />
                  )}
                </div>
              </li>
            );
          }

          return (
            <li key={index} className="relative">
              <button
                onClick={() => toggleStep(index)}
                className={`min-w-34 flex w-full flex-shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors ${
                  isOpen
                    ? "bg-gray-700 text-gray-200"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                }`}
              >
                <span
                  className={`z-10 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold ${
                    isOpen
                      ? "border-blue-400 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  {index + 1}
                </span>
                {annotation.action.title}
              </button>
              <div
                className={`${isOpen ? "mt-1" : "hidden"}`}
              >
                {isOpen && (
                  <div className="px-2 py-1">
                    <div className="text-sm italic text-gray-400">
                      <ReactMarkdown>
                        {annotation.action.reasoning}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}; 