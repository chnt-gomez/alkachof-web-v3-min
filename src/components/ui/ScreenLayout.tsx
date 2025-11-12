import React, { type ReactNode } from 'react';

interface Props {
    children: ReactNode
}

export const ScreenLayout: React.FC<Props> = ( {children} ) => {
    return (
        <div className="flex flex-col w-full min-h-screen">
            {children}
        </div>
    )
}