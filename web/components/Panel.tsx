import React, { ReactNode } from 'react'

export default function Panel({ children }: { children: ReactNode }) {
  return <div className="p-8 flex flex-col items-center gap-2 sm:border border-yellow-950">
    {children}
  </div>
}
