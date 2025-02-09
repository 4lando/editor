import React from "react";
import { ScrollArea } from "./scroll-area";

/**
 * Info panel component that displays information in a scrollable area
 * @param {Object} props - Component props
 * @param {string} props.title - The title to display at the top of the panel
 * @param {React.ReactNode} props.content - The content to display in the scrollable area
 * @returns {React.ReactElement} The InfoPanel component
 */
export function InfoPanel({ title, content }) {
  return (
    <div className="space-y-4">
      {title && <h2 className="text-xl font-semibold text-gray-900 dark:text-white p-6 pb-4">{title}</h2>}
      <ScrollArea className={`h-[520px] p-6 ${title && "pt-0"}`}>
        <div className="prose prose-sm dark:prose-invert">{content}</div>
      </ScrollArea>
    </div>
  );
}
