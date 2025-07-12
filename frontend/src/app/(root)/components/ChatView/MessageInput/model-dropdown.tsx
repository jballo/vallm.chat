"use client"

import { ChevronDown } from "lucide-react"

interface ModelDropdownProps {
    selectedModel: {
        id: string;
        name: string;
        icon: string;
        capabilities: string[];
    }
}

export function ModelDropdownButton({ selectedModel }: ModelDropdownProps) {
    return (
        <div
            // variant="ghost"
            className="flex items-center gap-2 h-9 px-3 text-sm rounded-xl transition-colors duration-200 border-1"
        >
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#8b5cf6] rounded-full" />
                <span className="font-medium">{selectedModel.name}</span>
                {/* <span className="text-xs text-gray-400 bg-[#2a2a2a] px-2 py-0.5 rounded-md">{selectedModel.type}</span> */}
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
    )
}
