import ReactMarkdown from "react-markdown";

interface SearchFeedbackProps {
  feedback: string;
  reasoning: string;
}

export function SearchFeedback({ feedback, reasoning }: SearchFeedbackProps) {
  return (
    <>
      {feedback && (
        <>
          <h4 className="mb-2 text-sm font-semibold text-gray-300">
            Feedback
          </h4>
          <div className="mb-2 text-sm text-gray-400">
            <ReactMarkdown>{feedback}</ReactMarkdown>
          </div>
        </>
      )}
      {reasoning && (
        <>
          <h4 className="mb-2 text-sm font-semibold text-gray-300">
            Reasoning
          </h4>
          <div className="text-sm text-gray-400">
            <ReactMarkdown>{reasoning}</ReactMarkdown>
          </div>
        </>
      )}
    </>
  );
}
