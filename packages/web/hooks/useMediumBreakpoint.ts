import { useMediaQuery } from 'react-responsive'

export function useMediumBreakpoint() {
	return useMediaQuery({ minWidth: 768 })
}
