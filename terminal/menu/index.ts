import prompts from 'prompts'
import pointersPrompt from './pointers'
import indexPrompt from './_index'
import extractPrompt from './extract'
import monitorPrompt from './monitor'
import quitPrompt from './quit'

export interface MenuAction {
  action: () => Promise<void>,
  menu: { title: string, value: string }
}

const actions = [
  pointersPrompt,
  indexPrompt,
  extractPrompt,
  monitorPrompt,
  quitPrompt,
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
