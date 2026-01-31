"use client";

import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";

export function ThemesProvider({
    children,
    ...props
}: React.ComponentProps<typeof ThemeProvider>) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        // Prevent rendering until mounted
        return <div className="hidden">{children}</div>;
    }

    return <ThemeProvider {...props}>{children}</ThemeProvider>;
}