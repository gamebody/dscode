import { ApprovalCategory } from '../utils/constants.js';
import { CodeAgentContext } from '../agents/codeAgent.js';
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

const toolName = 'askUserQuestion';

export const askUserQuestionToolSchema: ChatCompletionFunctionTool = {
  type: "function",
  function: {
    name: toolName,
    description: `Use this tool when you need to ask the user questions during execution. This allows you to:
1. Gather user preferences or requirements
2. Clarify ambiguous instructions
3. Get decisions on implementation choices as you work
4. Offer choices to the user about what direction to take.

Usage notes:
- Users will always be able to select "Other" to provide custom text input
- Use multiSelect: true to allow multiple answers to be selected for a question
- If you recommend a specific option, make that the first option in the list and add "(Recommended)" at the end of the label`,
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          description: "Questions to ask the user (1-4 questions)",
          minItems: 1,
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: 'The complete question to ask the user. Should be clear, specific, and end with a question mark. Example: "Which library should we use for date formatting?" If multiSelect is true, phrase it accordingly, e.g. "Which features do you want to enable?"',
              },
              header: {
                type: "string",
                maxLength: 12,
                description: 'Very short label displayed as a chip/tag (max 12 chars). Examples: "Auth method", "Library", "Approach".',
              },
              options: {
                type: "array",
                description: "The available choices for this question. Must have 2-4 options. Each option should be a distinct, mutually exclusive choice (unless multiSelect is enabled). There should be no 'Other' option, that will be provided automatically.",
                minItems: 2,
                maxItems: 4,
                items: {
                  type: "object",
                  properties: {
                    label: {
                      type: "string",
                      description: "The display text for this option that the user will see and select. Should be concise (1-5 words) and clearly describe the choice.",
                    },
                    description: {
                      type: "string",
                      description: "Explanation of what this option means or what will happen if chosen. Useful for providing context about trade-offs or implications.",
                    },
                  },
                  required: ["label", "description"],
                },
              },
              multiSelect: {
                type: "boolean",
                description: "Set to true to allow the user to select multiple options instead of just one. Use when choices are not mutually exclusive.",
                default: false,
              },
            },
            required: ["question", "header", "options"],
          },
        },
      },
      required: ["questions"],
    },
  },
};

type QuestionOption = {
  label: string;
  description: string;
};

type Question = {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect?: boolean;
};

type Input = {
  questions: Question[];
};

type Output = {
  llmContent: string;
}

export const askUserQuestionExecutor = async (
  { questions }: Input,
  context: CodeAgentContext,
  qas: { q: string, a: string }[]
) => {
  if (!qas || qas.length === 0) {
    return {
      isError: true,
      returnDisplay: 'No answers provided by user',
      payload: {
        llmContent: 'No answers provided by user',
      }
    };
  }
  const summary = `${qas.map(({q,a}) => `"${q}" = "${a}"`).join('\n')}`

  return {
    type: "tool-result" as const,
    payload: {
      llmContent: `User has answered your question: ${summary}. You can now continue with the user's answer in mind.`,
    },
    returnDisplay: summary,
  };
};

askUserQuestionExecutor.approval = {
  category: ApprovalCategory.ASK,
};

export type AskUserQuestionTool = {
  name: 'askUserQuestion',
  input: Input,
  output: Output,
}
