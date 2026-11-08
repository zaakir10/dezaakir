"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Code,
  FileCode,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  FileText,
} from "lucide-react";

interface RichTextEditorProps {
  value?: string;
  content?: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, content, onChange, placeholder }: RichTextEditorProps) {
  const htmlValue = content ?? value ?? "";
  const [sourceMode, setSourceMode] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        inline: false,
      }),
    ],
    content: htmlValue || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "prose-dezaakir min-h-[260px] max-h-[520px] overflow-y-auto px-4 py-3 text-sm text-white focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (editor && htmlValue !== editor.getHTML()) {
      editor.commands.setContent(htmlValue || "<p></p>", { emitUpdate: false });
    }
  }, [htmlValue, editor]);

  const promptLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter HTTPS URL:", previousUrl ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const promptImage = () => {
    if (!editor) return;
    const url = window.prompt("Enter Cloudinary HTTPS Image URL:", "https://res.cloudinary.com/");
    if (!url || !url.trim()) return;
    const alt = window.prompt("Enter image alt text:", "") ?? "";
    editor.chain().focus().setImage({ src: url.trim(), alt: alt.trim() }).run();
  };

  const btnClass = (active = false) =>
    `inline-flex items-center justify-center border px-2 py-1.5 text-xs transition ${
      active
        ? "border-white bg-white text-navy font-semibold"
        : "border-white/15 bg-navy text-white/80 hover:border-white/50 hover:text-white"
    }`;

  return (
    <div className="border border-white/20 bg-navy">
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-white/15 bg-white/[0.03] p-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={btnClass(editor?.isActive("heading", { level: 2 }))}
            title="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            className={btnClass(editor?.isActive("heading", { level: 3 }))}
            title="Heading 3"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={btnClass(editor?.isActive("bold"))}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={btnClass(editor?.isActive("italic"))}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleCode().run()}
            className={btnClass(editor?.isActive("code"))}
            title="Inline Code"
          >
            <Code className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            className={btnClass(editor?.isActive("codeBlock"))}
            title="Code Block"
          >
            <FileCode className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={btnClass(editor?.isActive("bulletList"))}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={btnClass(editor?.isActive("orderedList"))}
            title="Ordered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            className={btnClass(editor?.isActive("blockquote"))}
            title="Blockquote"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={promptLink}
            className={btnClass(editor?.isActive("link"))}
            title="Insert Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={promptImage}
            className={btnClass(false)}
            title="Insert Image"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().undo().run()}
            className={btnClass(false)}
            title="Undo"
          >
            <Undo className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().redo().run()}
            className={btnClass(false)}
            title="Redo"
          >
            <Redo className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSourceMode((prev) => !prev)}
          className={btnClass(sourceMode)}
          title="Toggle HTML Source"
        >
          <FileText className="mr-1 h-3.5 w-3.5" />
          {sourceMode ? "Visual" : "HTML"}
        </button>
      </div>

      {sourceMode ? (
        <textarea
          value={htmlValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "<p>Write content...</p>"}
          rows={12}
          className="w-full bg-navy p-4 font-mono text-xs text-white focus:outline-none"
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
