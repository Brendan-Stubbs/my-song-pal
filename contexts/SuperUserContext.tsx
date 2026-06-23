'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { fetchIsSuperUser, getViewAsStandard, setViewAsStandard } from '@/lib/super-user'

interface SuperUserContextValue {
  /** Whether the signed-in user has the super-user flag in the DB. */
  isSuperUser: boolean
  /** True when a super user has toggled "view as standard user". */
  viewingAsStandard: boolean
  /**
   * True when the user can see super-user-only features.
   * = isSuperUser && !viewingAsStandard
   */
  canSeeSuperUserFeatures: boolean
  toggleViewAsStandard: () => void
}

const SuperUserContext = createContext<SuperUserContextValue>({
  isSuperUser: false,
  viewingAsStandard: false,
  canSeeSuperUserFeatures: false,
  toggleViewAsStandard: () => {},
})

export function SuperUserProvider({ children }: { children: React.ReactNode }) {
  const [isSuperUser, setIsSuperUser] = useState(false)
  const [viewingAsStandard, setViewingAsStandard] = useState(false)

  useEffect(() => {
    void fetchIsSuperUser().then(setIsSuperUser)
    setViewingAsStandard(getViewAsStandard())
  }, [])

  function toggleViewAsStandard() {
    const next = !viewingAsStandard
    setViewingAsStandard(next)
    setViewAsStandard(next)
  }

  return (
    <SuperUserContext.Provider
      value={{
        isSuperUser,
        viewingAsStandard,
        canSeeSuperUserFeatures: isSuperUser && !viewingAsStandard,
        toggleViewAsStandard,
      }}
    >
      {children}
    </SuperUserContext.Provider>
  )
}

export function useSuperUser(): SuperUserContextValue {
  return useContext(SuperUserContext)
}
