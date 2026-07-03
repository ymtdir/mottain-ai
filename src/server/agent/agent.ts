import { streamText  } from "ai";
import type {ModelMessage} from "ai";
import { geminiFlash } from "../model/gemini";
import { buildSystemPrompt, loadUserContext } from "./context";

export async function runAgent(messages: ModelMessage[]) {
  const ctx = await loadUserContext();
  const systemPrompt = buildSystemPrompt(ctx);

  return streamText({
    model: geminiFlash,
    system: systemPrompt,
    messages,
  });
}
