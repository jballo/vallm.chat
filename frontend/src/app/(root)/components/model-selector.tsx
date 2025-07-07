"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/atoms/popover";
import { ModelDropdownButton } from "./model-dropdown";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/atoms/command";
import {
  Brain,
  FileText,
  Globe,
  ImageIcon,
  Languages,
  Zap,
} from "lucide-react";

interface ModelSelectorProps {
  selectedModel: {
    id: string;
    name: string;
    icon: string;
    capabilities: string[];
  };
  setSelectedModel: (model: {
    id: string;
    name: string;
    icon: string;
    provider: string;
    capabilities: string[];
  }) => void;
}

const allModels = [
  {
    id: "llama-3.1-8b-instant",
    name: "LLama 3.1 8b",
    icon: "llama",
    provider: "Groq",
    capabilities: ["multilingual", "speed"],
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70b",
    icon: "llama",
    provider: "Groq",
    capabilities: ["multilingual"],
  },
  {
    id: "mistral-saba-24b",
    name: "Mistral Saba 24B",
    icon: "Mistral",
    provider: "Groq",
    capabilities: ["multilingual"],
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 Distilled Llama",
    icon: "deepseek",
    provider: "OpenRouter",
    capabilities: ["reasoning", "speed"],
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    icon: "gemini",
    provider: "Gemini",
    capabilities: ["image", "search", "pdf"],
  },
  // {
  //     id: "gpt-imagegen",
  //     name: "GPT ImageGen",
  //     icon: "gpt",
  //     capabilities: ["vision"],
  // },
];

const capabilityIcons: { [key: string]: React.FC<{ className?: string }> } = {
  multilingual: Languages,
  speed: Zap,
  reasoning: Brain,
  image: ImageIcon,
  search: Globe,
  pdf: FileText,
};

export function ModelSelector({
  selectedModel,
  setSelectedModel,
}: ModelSelectorProps) {
  return (
    <Popover>
      <PopoverTrigger>
        <ModelDropdownButton selectedModel={selectedModel} />
      </PopoverTrigger>
      <PopoverContent className="p-0 border border-[#2a2a2a] rounded-lg shadow-lg">
        <Command className="p-2">
          <CommandInput
            placeholder="Type model name here..."
            className="border border-[#2a2a2a] rounded-lg h-7 p-2"
          />
          <CommandList className="py-2">
            <CommandEmpty className="text-gray-500">
              No Model Found
            </CommandEmpty>
            {allModels.map((model) => (
              <CommandItem
                key={model.id}
                onSelect={() => {
                  setSelectedModel(model);
                }}
                className="flex items-center justify-between"
              >
                <span>{model.name}</span>
                <span className="flex gap-2">
                  {model.capabilities.map((capability, idx) => {
                    const Icon = capabilityIcons[capability];
                    return Icon ? <Icon key={idx} className="w-4 h-4" /> : null;
                  })}
                </span>
              </CommandItem>
            ))}
            {/* <CommandItem>Llama 4</CommandItem> */}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
