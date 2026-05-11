'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

const toolbarBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '3px 8px',
  fontSize: '0.78rem',
  cursor: 'pointer',
  color: 'var(--text-primary)',
  lineHeight: 1.4,
}

const toolbarBtnActive: React.CSSProperties = {
  ...toolbarBtn,
  background: 'var(--ocean-deep)',
  color: '#fff',
  borderColor: 'var(--ocean-deep)',
}

export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (html: string) => void
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        style: [
          'min-height:120px',
          'padding:12px 14px',
          'outline:none',
          'font-size:0.9rem',
          'line-height:1.6',
          'color:var(--text-primary)',
        ].join(';'),
      },
    },
  })

  // Sync if parent value changes externally (e.g. moving tour between lists)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '')
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null

  const B = (active: boolean) => (active ? toolbarBtnActive : toolbarBtn)

  return (
    <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 10px', borderBottom: '1px solid var(--border)', background: 'var(--foam)', flexWrap: 'wrap' }}>
        <button type="button" style={B(editor.isActive('bold'))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}>
          <strong>B</strong>
        </button>
        <button type="button" style={B(editor.isActive('italic'))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}>
          <em>I</em>
        </button>
        <button type="button" style={B(editor.isActive('heading', { level: 3 }))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run() }}>
          H
        </button>
        <span style={{ width: 1, background: 'var(--border)', margin: '2px 4px' }} />
        <button type="button" style={B(editor.isActive('bulletList'))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}>
          • List
        </button>
        <button type="button" style={B(editor.isActive('orderedList'))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }}>
          1. List
        </button>
        <span style={{ width: 1, background: 'var(--border)', margin: '2px 4px' }} />
        <button type="button" style={toolbarBtn}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().undo().run() }}>
          ↩
        </button>
        <button type="button" style={toolbarBtn}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().redo().run() }}>
          ↪
        </button>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  )
}
