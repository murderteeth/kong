import prompts from 'prompts'
import registriesPrompt from './registries'
import pollPrompt from './poll'
import vaultsPrompt from './vaults'
import indexPrompt from './_index'
import extractPrompt from './extract'
import quitPrompt from './quit'

export interface MenuAction {
  action: () => Promise<void>,
  menu: { title: string, value: string }
}

const actions = [
  pollPrompt,
  registriesPrompt,
  vaultsPrompt,
  indexPrompt,
  extractPrompt,
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
