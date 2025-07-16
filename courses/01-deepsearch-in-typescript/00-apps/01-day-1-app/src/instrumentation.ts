import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";

export function register() {
  registerOTel({
    serviceName: "ai-hero-harry-turnbull-service",
    traceExporter: new LangfuseExporter(),
  });
} 