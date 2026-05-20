import { BaseCommand, CommandContext } from "../command";

const STAGE_ART: Record<string, string> = {
  '幼崽': `
  /\\_/\\
 ( ^.^ )
  >   <
  `,
  '成长': `
   /\\_/\\
  ( o.o )
  (  ~  )
   )  (
  `,
  '成熟': `
   /\\___/\\
  ( =^.^= )
  (  U U  )
  `,
  '巨型': `
    /\\_____/\\
   ( =^. .^= )
   (  U   U  )
  `,
}

function progressBar(ratio: number, width: number): string {
  const filled = Math.round(ratio * width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

export class BuddyCommand extends BaseCommand {
  name = '/buddy'
  description = '查看宠物状态'

  execute(context: CommandContext, input?: string): void {
    const { pushUIMessage, buddy } = context

    pushUIMessage({ role: 'user', content: input || '/buddy' })

    const tokens = buddy.lifetimeTokens
    const stage = buddy.getStage()
    const art = STAGE_ART[stage.stage] || STAGE_ART['幼崽']

    const content = [
      `\`\`\``,
      art,
      `\`\`\``,
      ``,
      `**胖瘦:** ${progressBar(stage.fatness, 10)} ${Math.round(stage.fatness * 100)}%`,
      `**大小:** ${progressBar(stage.size, 10)} ${Math.round(stage.size * 100)}%`,
      `**阶段:** ${stage.stage}`,
      `**终身Token:** ${tokens.toLocaleString()}`,
    ].join('\n')

    pushUIMessage({ role: 'assistant', content })
  }
}
