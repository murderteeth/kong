import { MenuAction } from '.'

export default {
  action,
  menu: { title: 'Quit', value: 'quit' }
} as MenuAction

async function action() {
  process.exit(0)
}
