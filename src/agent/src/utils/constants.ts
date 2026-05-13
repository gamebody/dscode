import { write } from "fs"






export const FETCH_SUCCESS_CODE = 200


export enum TOOL_NAMES {
  TODO_WRITE = 'todoWrite',
  TODO_READ = 'todoRead',
  BASH = 'bash',
  BASH_OUTPUT = 'bash_output',
  KILL_BASH = 'kill_bash',
  GREP = 'grep',
  ASK_USER_QUESTION = 'AskUserQuestion',
}

export enum ApprovalCategory {
  COMMAND = 'command',
  WRITE = 'write',
  READ = 'read',
  ASK = 'ask',
}
