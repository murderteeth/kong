import prompts from 'prompts'
import extractPrompt from './extract'
import cronsPrompt from './crons'
import toolsPrompt from './tools'
import fanoutPrompt from './fanout'
import errorPrompt from './errors'
import quitPrompt from './quit'

export interface MenuAction {
  action: () => Promise<void>,
  menu: { title: string, value: string }
}

const actions = [
  fanoutPrompt,
  extractPrompt,
  cronsPrompt,
  errorPrompt,
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
