import prompts from 'prompts'
import extractPrompt from './extract'
import quitPrompt from './quit'
import toolsPrompt from './tools'
import fanoutPrompt from './fanout'

export interface MenuAction {
  action: () => Promise<void>,
  menu: { title: string, value: string }
}

const actions = [
  fanoutPrompt,
  extractPrompt,
  toolsPrompt,
  quitPrompt
] as MenuAction[]

export async function menuPrompt() {
  const choice = (await prompts([
    {
      type: 'select',
      name: 'choice',
      message: '🐒 menu',
      choices: actions.map(action => action.menu),
    }
  ])).choice
  await actions.find(a => a.menu.value === choice)?.action()
}
