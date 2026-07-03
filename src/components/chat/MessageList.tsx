import { isTextUIPart  } from "ai";
import type {UIMessage} from "ai";

type Props = {
  messages: UIMessage[];
};

export function MessageList({ messages }: Props) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        在庫を伝えて、献立と買い物リストを作りましょう。
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((message) => {
        const text = message.parts.filter(isTextUIPart).map((p) => p.text).join("");
        if (!text) return null;
        return (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
