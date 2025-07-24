import ReactMarkdown from "react-markdown";

interface SearchFeedbackProps {
  feedback: string;
  reasoning: string;
}

export function SearchFeedback({ feedback, reasoning }: SearchFeedbackProps) {
  return (
    <div className="px-2 py-1">
      {feedback && (
        <>
          <div className="mb-1 font-medium">Feedback</div>
          <div className="mb-2 text-sm text-gray-400">
            <ReactMarkdown>{feedback}</ReactMarkdown>
          </div>
        </>
      )}
      {reasoning && (
        <>
          <div className="mb-1 font-medium">Reasoning</div>
          <div className="mb-2 text-sm text-gray-400">
            <ReactMarkdown>{reasoning}</ReactMarkdown>
          </div>
        </>
      )}
    </div>
  );
}
