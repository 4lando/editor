import * as monaco from "monaco-editor";

export const MarkerSeverity = {
  Hint: monaco.MarkerSeverity.Hint,
  Info: monaco.MarkerSeverity.Info,
  Warning: monaco.MarkerSeverity.Warning,
  Error: monaco.MarkerSeverity.Error,
};

export const SeveritySymbols = {
  [monaco.MarkerSeverity.Hint]: "💡",
  [monaco.MarkerSeverity.Info]: "ℹ️",
  [monaco.MarkerSeverity.Warning]: "⚠️",
  [monaco.MarkerSeverity.Error]: "❌",
};
