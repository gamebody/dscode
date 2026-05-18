import Core from "../core/index.js";
import { COMPACT_INSTRUCTION, SYSTEM_COMPACT } from "../prompts/system.compact.js";


export default function compactAgent(logsDir?: string) {
  
  
  const agent = new Core({
    system: SYSTEM_COMPACT(),
    logsDir: logsDir,
  })


  // todo
  agent.appendMessage(
    { role: "user", content: COMPACT_INSTRUCTION() }
  )


  return agent
}


