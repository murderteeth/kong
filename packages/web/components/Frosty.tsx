import { motion } from 'framer-motion'
import colors from 'tailwindcss/colors'
import React, { ReactNode } from 'react'

export default function Frosty(
  { _key, disabled, children } :
  { _key: string, disabled?: boolean, children: ReactNode }
) {
  return <motion.div key={_key}
    transition={{ease: 'easeInOut', duration: .75}}
    initial={{color: colors.yellow[300]}}
    animate={{color: disabled ? colors.yellow[950] : colors.yellow[700]}}
    className="whitepspace-pre">
      {children}
  </motion.div>
}
