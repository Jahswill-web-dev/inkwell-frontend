import {
  Code,
  FileDoc,
  FilePdf,
  FileText,
  Hash,
  type Icon,
} from "@phosphor-icons/react";
import type { ExportFormat } from "./export-data";
import styles from "./export-formats.module.css";

type FormatOption = {
  id: ExportFormat;
  label: string;
  description: string;
  icon: Icon;
  disabled?: boolean;
};

const formats: readonly FormatOption[] = [
  {
    id: "copy",
    label: "Copy formatted text",
    description: "Retains styling, structure, and formatting.",
    icon: FileText,
  },
  {
    id: "markdown",
    label: "Markdown",
    description: "Export as Markdown for easy portability.",
    icon: Hash,
  },
  {
    id: "html",
    label: "HTML",
    description: "Export as HTML for web publishing.",
    icon: Code,
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Export as a PDF for sharing or printing.",
    icon: FilePdf,
    disabled: true,
  },
  {
    id: "docx",
    label: "Word document",
    description: "Export as a .docx file for editing in Word.",
    icon: FileDoc,
    disabled: true,
  },
];

export const formatLabels: Record<ExportFormat, string> = {
  copy: "Copy formatted text",
  markdown: "Markdown",
  html: "HTML",
  pdf: "PDF",
  docx: "Word document",
};

export function ExportFormats({
  value,
  onChange,
}: {
  value: ExportFormat;
  onChange: (format: ExportFormat) => void;
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend>Choose format</legend>
      <div className={styles.options}>
        {formats.map(({ id, label, description, icon: Icon, disabled }) => (
          <label
            className={`${styles.option} ${value === id ? styles.selected : ""} ${disabled ? styles.disabled : ""}`}
            key={id}
          >
            <Icon
              className={styles.icon}
              size={37}
              weight="regular"
              aria-hidden
            />
            <span className={styles.copy}>
              <strong>{label}</strong>
              <span className={styles.description}>{description}</span>
              {disabled ? <small>Coming soon</small> : null}
            </span>
            <input
              checked={value === id}
              disabled={disabled}
              name="export-format"
              onChange={() => onChange(id)}
              type="radio"
              value={id}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
