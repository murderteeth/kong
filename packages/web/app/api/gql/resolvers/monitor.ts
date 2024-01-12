import db from '../../db'

const monitor = async () => {
  try {
    const query = 'SELECT latest FROM monitor;'
    const [singleton] = (await db.query(query)).rows
    return singleton.latest
  } catch (error) {
    console.error(error)
    throw new Error('Failed to run monitor')
  }
}

export default monitor
