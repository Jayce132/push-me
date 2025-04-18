import { useState, useEffect } from 'react';

/**
 * A hook that syncs a piece of state into sessionStorage under `key`.
 * If nothing’s in sessionStorage yet, it seeds with defaultValue.
 */
export default function useSession(key, defaultValue) {
    const [value, setValue] = useState(() => {
        const stored = sessionStorage.getItem(key)
        return stored !== null
            ? JSON.parse(stored)
            : defaultValue
    });

    // Any time `value` changes, write it back to sessionStorage
    useEffect(() => {
        sessionStorage.setItem(key, JSON.stringify(value))
    }, [key, value]);

    return [value, setValue];
}
