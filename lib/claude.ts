import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES, Category, SENSITIVE_CATEGORIES } from "@/lib/types";
import { SearchResult } from "@/lib/search";
import { keywordClassifyAndAnswer } from "@/lib/keywordAnswer";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export interface ClassifyAndAnswerResult {
  category: Category;
  canAnswer: boolean;
  answer: string | null;
  confidence: number;
  citedChunkIds: number[];
}

const TOOL_NAME = "classify_and_answer";

function buildSystemPrompt(): string {
  return `당신은 Re2O(의료/제약 관련 사업)의 영업사원을 지원하는 AI 어시스턴트입니다.
영업사원의 문의를 다음 카테고리 중 하나로 분류하세요: ${CATEGORIES.join(", ")}.
어느 카테고리에도 명확히 속하지 않으면 "기타"로 분류하세요.

답변은 반드시 아래 제공되는 "참고 자료" 안의 내용만 근거로 작성해야 합니다. 참고 자료에 없는 내용을 추측하거나 일반 지식으로 답변하지 마세요.
참고 자료에서 질문에 대한 명확한 근거를 찾을 수 없으면 can_answer를 false로 설정하고, 답변은 비워두세요. 이 경우 PM에게 이관됩니다.

"실제 임상"과 "부작용" 카테고리는 잘못된 정보가 큰 위험(의학적 오해, 규제 이슈)을 초래할 수 있습니다. 이 두 카테고리에서는 참고 자료에 질문과 정확히 일치하는 명시적 근거 문장이 있을 때만 can_answer를 true로 설정하세요. 조금이라도 불확실하면 반드시 can_answer를 false로 설정해 PM에게 이관하세요.

can_answer가 true일 때는 참고 자료 내용을 바탕으로 친절하고 간결한 한국어로 답변하고, 실제로 사용한 참고 자료의 chunk_id를 cited_chunk_ids에 포함하세요.`;
}

function buildUserMessage(question: string, chunks: SearchResult[]): string {
  if (chunks.length === 0) {
    return `[참고 자료]\n(관련 자료를 찾지 못했습니다)\n\n[질문]\n${question}`;
  }
  const context = chunks
    .map((c) => `chunk_id: ${c.id}\n출처: ${c.filename}\n내용: ${c.content}`)
    .join("\n\n---\n\n");
  return `[참고 자료]\n${context}\n\n[질문]\n${question}`;
}

export async function classifyAndAnswer(
  question: string,
  chunks: SearchResult[]
): Promise<ClassifyAndAnswerResult> {
  const anthropic = getClient();

  if (!anthropic) {
    return keywordClassifyAndAnswer(question, chunks);
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserMessage(question, chunks) }],
    tools: [
      {
        name: TOOL_NAME,
        description: "질문을 분류하고, 가능하면 답변을 생성합니다.",
        input_schema: {
          type: "object",
          properties: {
            category: { type: "string", enum: CATEGORIES as unknown as string[] },
            can_answer: { type: "boolean" },
            answer: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            cited_chunk_ids: { type: "array", items: { type: "number" } },
          },
          required: ["category", "can_answer", "confidence"],
        },
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUse) {
    return {
      category: "기타",
      canAnswer: false,
      answer: null,
      confidence: 0,
      citedChunkIds: [],
    };
  }

  const input = toolUse.input as {
    category: string;
    can_answer: boolean;
    answer?: string;
    confidence: number;
    cited_chunk_ids?: number[];
  };

  const category: Category = CATEGORIES.includes(input.category as Category)
    ? (input.category as Category)
    : "기타";

  const isSensitive = SENSITIVE_CATEGORIES.includes(category);
  const canAnswer = input.can_answer && (!isSensitive || input.confidence >= 0.85);

  return {
    category,
    canAnswer,
    answer: canAnswer ? input.answer ?? null : null,
    confidence: input.confidence ?? 0,
    citedChunkIds: input.cited_chunk_ids ?? [],
  };
}
