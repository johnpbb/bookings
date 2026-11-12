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
  emailTools = false,
  minHeight = 120,
}: {
  value: string
  onChange: (html: string) => void
  /** Adds a larger heading and link buttons, for email and form wording. */
  emailTools?: boolean
  minHeight?: number
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: { openOnClick: false } })],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        style: [
          `min-height:${minHeight}px`,
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

  function editLink() {
    if (!editor) return
    const url = window.prompt('Link address (leave empty to remove the link)', editor.getAttributes('link').href ?? 'https://')
    if (url === null) return
    const chain = editor.chain().focus().extendMarkRange('link')
    if (url.trim() === '' || url.trim() === 'https://') chain.unsetLink().run()
    else chain.setLink({ href: url.trim() }).run()
  }

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
        {emailTools && (
          <button type="button" style={B(editor.isActive('heading', { level: 2 }))}
            onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run() }}>
            Heading
          </button>
        )}
        <button type="button" style={B(editor.isActive('heading', { level: 3 }))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run() }}>
          {emailTools ? 'Subheading' : 'H'}
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
        {emailTools && (
          <button type="button" style={B(editor.isActive('link'))}
            onMouseDown={e => { e.preventDefault(); editLink() }}>
            Link
          </button>
        )}
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
