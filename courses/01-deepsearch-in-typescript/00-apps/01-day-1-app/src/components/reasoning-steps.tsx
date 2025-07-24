import type { MessageAnnotation } from "~/types";
import { QueryPlan } from "./query-plan";
import { AnnotationWrapper } from "./annotation-wrapper";
import { SearchFeedback } from "./search-feedback";

type ReasoningStepsProps = {
  annotations: MessageAnnotation[];
};

export function ReasoningSteps({ annotations }: ReasoningStepsProps) {
  if (annotations.length === 0) return null;

  return (
    <div className="mb-4 w-full">
      <ul className="space-y-1">
        {annotations.map((annotation, index) => {
          if (annotation.type === "QUERY_PLAN") {
            const title = `Planning search queries (${annotation.queries.length} queries)`;
            return (
              <AnnotationWrapper key={index} title={title} index={index}>
                <QueryPlan
                  plan={annotation.plan}
                  queries={annotation.queries}
                />
              </AnnotationWrapper>
            );
          }

          if (annotation.type === "NEW_ACTION") {
            const title = `Search`;
            return (
              <AnnotationWrapper key={index} title={title} index={index}>
                <SearchFeedback
                  feedback={annotation.action.feedback}
                  reasoning={annotation.action.reasoning}
                />
              </AnnotationWrapper>
            );
          }

          return null;
        })}
      </ul>
    </div>
  );
}
