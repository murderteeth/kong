import { motion } from 'framer-motion'
import colors from 'tailwindcss/colors'
import React, { ReactNode } from 'react'

export default function Frosty({ _key, children }: { _key: string, children: ReactNode }) {
  return <motion.div key={_key}
    transition={{ease: 'easeInOut', duration: .75}}
    initial={{color: colors.yellow[300]}}
    animate={{color: colors.yellow[700]}}
    className="whitepspace-nowrap">
      {children}
  </motion.div>
}
