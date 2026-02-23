'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface UnsavedChangesContextType {
    isDirty: boolean;
    setIsDirty: (value: boolean) => void;
    handleNavigation: (href: string) => void;
    isModalOpen: boolean;
    confirmNavigation: () => void;
    cancelNavigation: () => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
    const [isDirty, setIsDirty] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingPath, setPendingPath] = useState<string | null>(null);
    const router = useRouter();

    const handleNavigation = (href: string) => {
        if (isDirty) {
            setPendingPath(href);
            setIsModalOpen(true);
        } else {
            router.push(href);
        }
    };

    const confirmNavigation = () => {
        setIsModalOpen(false);
        setIsDirty(false); // Reset dirty state as we are navigating away
        if (pendingPath) {
            router.push(pendingPath);
            setPendingPath(null);
        }
    };

    const cancelNavigation = () => {
        setIsModalOpen(false);
        setPendingPath(null);
    };

    return (
        <UnsavedChangesContext.Provider value={{
            isDirty,
            setIsDirty,
            handleNavigation,
            isModalOpen,
            confirmNavigation,
            cancelNavigation
        }}>
            {children}
        </UnsavedChangesContext.Provider>
    );
}

export function useUnsavedChanges() {
    const context = useContext(UnsavedChangesContext);
    if (context === undefined) {
        throw new Error('useUnsavedChanges must be used within a UnsavedChangesProvider');
    }
    return context;
}
