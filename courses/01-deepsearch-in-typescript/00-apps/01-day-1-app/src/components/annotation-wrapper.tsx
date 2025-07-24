import type { ReactNode } from "react";
import { useState } from "react";

interface AnnotationWrapperProps {
  index: number;
  title: string;
  children: ReactNode;
};

export function AnnotationWrapper({
  index,
  title,
  children,
}: AnnotationWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleStep = () => {
    setIsOpen(!isOpen);
  };

  return (
    <li className="relative">
      <button
        onClick={() => toggleStep()}
        className={`min-w-34 flex w-full flex-shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors ${
          isOpen
            ? "bg-gray-700 text-gray-200"
            : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
        }`}
      >
        <span
          className={`z-10 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold ${
            isOpen ? "border-green-400 text-white" : "bg-gray-800 text-gray-300"
          }`}
        >
          {index + 1}
        </span>
        {title}
      </button>
      {isOpen && <div className="mt-1">{children}</div>}
    </li>
  );
};
