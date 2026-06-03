"use client";

import dynamic from "next/dynamic";

const TinyMCEEditor = dynamic(
  () => import("@tinymce/tinymce-react").then((mod) => mod.Editor),
  { ssr: false },
);

export function RichTextEditor({ value, onChange }) {
  return (
    <TinyMCEEditor
      apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
      value={value || ""}
      onEditorChange={onChange}
      init={{
        menubar: false,
        branding: false,
        height: 280,
        plugins: "lists link table code",
        toolbar:
          "undo redo | blocks | bold italic underline | bullist numlist | link table | removeformat | code",
        content_style:
          "body { font-family: Geist Sans, Arial, sans-serif; font-size: 14px; }",
      }}
    />
  );
}
