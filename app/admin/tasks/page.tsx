'use client'
import { useEffect, useState } from 'react'

const inp: React.CSSProperties = {
  width: '100%', background: '#080a0f', border: '1px solid #1a2230',
  color: '#c0cce0', fontFamily: "'Share Tech Mono'", fontSize: 12,
  padding: '7px 10px', borderRadius: 3, outline: 'none',
}
const lbl: React.CSSProperties = {
  display: 'block', fontFamily: "'Share Tech Mono'", fontSize: 10,
  color: '#4a5a70', letterSpacing: '1px', marginBottom: 5,
}
const panel: React.CSSProperties = {
  background: '#111520', border: '1px solid #1a2230',
  borderRadius: 6, overflow: 'hidden', marginBottom: 12,
}
const panelHead: React.CSSProperties = {
  padding: '10px 14px', borderBottom: '1px solid #1a2230',
  fontFamily: "'Share Tech Mono'", fontSize: 10,
  color: '#4a5a70', letterSpacing: '2px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}
const panelBody: React.CSSProperties = { padding: 14 }
const th: React.CSSProperties = {
  padding: '7px 10px', textAlign: 'left', color: '#4a5a70',
  fontSize: 9, letterSpacing: '1px', borderBottom: '1px solid #1a2230',
  fontFamily: "'Share Tech Mono'",
}
const td: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid #1a2230',
  fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#c0cce0',
}

const TASK_TYPES = [
  { value: 'referral', label: 'Referral count',        needsTarget: true,  needsMedia: false, xOnly: false },
  { value: 'nodes',    label: 'Node count',             needsTarget: true,  needsMedia: false, xOnly: false },
  { value: 'purchase', label: 'Purchase count',         needsTarget: true,  needsMedia: false, xOnly: false },
  { value: 'ranking',  label: 'Season ranking',         needsTarget: true,  needsMedia: false, xOnly: false },
  { value: 'daily',    label: 'Daily active',           needsTarget: false, needsMedia: false, xOnly: false },
  { value: 'channel',  label: 'Join Telegram channel',  needsTarget: false, needsMedia: false, xOnly: false },
  { value: 'manual',   label: 'Announcement / visit link', needsTarget: false, needsMedia: true, xOnly: false },
  { value: 'x_link',    label: '(Soon) Link X account', needsTarget: false, needsMedia: false, xOnly: true },
  { value: 'x_retweet', label: '(Soon) Retweet a post',  needsTarget: false, needsMedia: false, xOnly: true },
  { value: 'x_like',    label: '(Soon) Like a post',     needsTarget: false, needsMedia: false, xOnly: true },
]

interface Task {
  id:          number
  slug:        string
  title:       string
  description: string
  icon:        string
  reward_rtm:  number
  type:        string
  target:      number
  is_active:   boolean
  image_url:   string | null
  gif_url:     string | null
  link_url:    string | null
  x_target:    string | null
  sort_order:  number
}

const EMPTY_FORM = {
  id:          null as number | null,
  slug:        '',
  title:       '',
  description: '',
  icon:        '🎯',
  reward_rtm:  100,
  type:        'manual',
  target:      1,
  is_active:   true,
  image_url:   '',
  gif_url:     '',
  link_url:    '',
  x_target:    '',
}

export default function AdminTasks() {
  const [tasks, setTasks]     = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState('')
  const [form, setForm]       = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => { loadTasks() }, [])

  async function loadTasks() {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/tasks')
      const json = await res.json()
      if (json.success) setTasks(json.tasks)
    } catch {
      showToast('❌ Failed to load tasks')
    }
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  function startEdit(task: Task) {
    setEditingId(task.id)
    setForm({
      id:          task.id,
      slug:        task.slug,
      title:       task.title,
      description: task.description,
      icon:        task.icon,
      reward_rtm:  task.reward_rtm,
      type:        task.type,
      target:      task.target ?? 1,
      is_active:   task.is_active,
      image_url:   task.image_url ?? '',
      gif_url:     task.gif_url ?? '',
      link_url:    task.link_url ?? '',
      x_target:    task.x_target ?? '',
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function saveTask() {
    if (!form.title.trim() || !form.slug.trim()) {
      showToast('❌ Title and slug are required')
      return
    }
    setSaving(true)

    const payload = {
      id:          editingId,
      slug:        form.slug.trim(),
      title:       form.title.trim(),
      description: form.description.trim(),
      icon:        form.icon || '🎯',
      reward_rtm:  Number(form.reward_rtm) || 0,
      type:        form.type,
      target:      Number(form.target) || 1,
      is_active:   form.is_active,
      image_url:   form.image_url.trim() || null,
      gif_url:     form.gif_url.trim() || null,
      link_url:    form.link_url.trim() || null,
      x_target:    form.x_target.trim() || null,
    }

    try {
      const res = await fetch('/api/admin/tasks', {
        method:  editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) {
        showToast('❌ ' + (json.error ?? 'Failed to save'))
      } else {
        showToast(editingId ? '✓ Task updated' : '✓ Task created')
        resetForm()
        loadTasks()
      }
    } catch {
      showToast('❌ Network error')
    }
    setSaving(false)
  }

  async function deleteTask(id: number) {
    try {
      const res = await fetch('/api/admin/tasks/action', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!json.success) showToast('❌ ' + (json.error ?? 'Failed to delete'))
      else { showToast('✓ Task deleted'); loadTasks() }
    } catch {
      showToast('❌ Network error')
    }
  }

  async function toggleActive(task: Task) {
    try {
      const res = await fetch('/api/admin/tasks/action', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: task.id, is_active: !task.is_active }),
      })
      const json = await res.json()
      if (!json.success) showToast('❌ ' + (json.error ?? 'Failed to update'))
      else loadTasks()
    } catch {
      showToast('❌ Network error')
    }
  }

  const selectedType = TASK_TYPES.find(t => t.value === form.type)!

  return (
    <div>
      <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#4a5a70', letterSpacing: '3px', marginBottom: 16 }}>
        🎯 TASKS
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 12 }}>

        {/* Form */}
        <div style={panel}>
          <div style={panelHead}>
            {editingId ? `EDITING TASK #${editingId}` : 'NEW TASK'}
            {editingId && (
              <button
                onClick={resetForm}
                style={{
                  background: 'none', border: '1px solid #1a2230',
                  color: '#4a5a70', fontFamily: "'Share Tech Mono'",
                  fontSize: 9, padding: '2px 8px', borderRadius: 2, cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
            )}
          </div>
          <div style={panelBody}>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>TYPE</label>
              <select style={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {TASK_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {selectedType.xOnly && (
                <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#f0a500', marginTop: 5 }}>
                  ⚠ X verification isn't live yet — task will show "SOON" in the app until wired up.
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>ICON (emoji)</label>
                <input style={inp} value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>SLUG (unique id)</label>
                <input style={inp} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="e.g. join_channel" />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>TITLE</label>
              <input style={inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Join our Telegram" />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>DESCRIPTION</label>
              <textarea
                style={{ ...inp, resize: 'none' }}
                rows={2}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>REWARD ($RTM)</label>
                <input type="number" style={inp} value={form.reward_rtm} onChange={e => setForm({ ...form, reward_rtm: Number(e.target.value) })} />
              </div>
              {selectedType.needsTarget && (
                <div>
                  <label style={lbl}>TARGET (count needed)</label>
                  <input type="number" style={inp} value={form.target} onChange={e => setForm({ ...form, target: Number(e.target.value) })} />
                </div>
              )}
            </div>

            {selectedType.needsMedia && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>IMAGE URL (optional)</label>
                  <input style={inp} value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>GIF URL (optional — takes priority over image)</label>
                  <input style={inp} value={form.gif_url} onChange={e => setForm({ ...form, gif_url: e.target.value })} placeholder="https://..." />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>LINK URL (optional — shows a VIEW button)</label>
                  <input style={inp} value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." />
                </div>
              </>
            )}

            {selectedType.xOnly && (
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>X TARGET (tweet id or @handle)</label>
                <input style={inp} value={form.x_target} onChange={e => setForm({ ...form, x_target: e.target.value })} placeholder="e.g. 1234567890123" />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                style={{
                  width: 36, height: 20, borderRadius: 10,
                  background: form.is_active ? '#00e5a0' : '#1a2230',
                  cursor: 'pointer', position: 'relative', transition: 'background .2s',
                }}
              >
                <div style={{
                  position: 'absolute', width: 14, height: 14,
                  background: '#fff', borderRadius: '50%',
                  top: 3, left: form.is_active ? 19 : 3, transition: 'left .2s',
                }} />
              </div>
              <span style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#c0cce0' }}>
                {form.is_active ? 'Active (visible in app)' : 'Inactive (hidden)'}
              </span>
            </div>

            <button
              onClick={saveTask}
              disabled={saving}
              style={{
                width: '100%',
                background: saving ? '#0a0d14' : '#0f0820',
                border: `1px solid ${saving ? '#1a2230' : '#7b5ea7'}`,
                color: saving ? '#4a5a70' : '#9d7fd4',
                fontFamily: "'Share Tech Mono'", fontSize: 11,
                padding: '8px 0', borderRadius: 3,
                cursor: saving ? 'not-allowed' : 'pointer',
                letterSpacing: '1px',
              }}
            >
              {saving ? 'SAVING...' : editingId ? 'UPDATE TASK' : 'CREATE TASK'}
            </button>
          </div>
        </div>

        {/* Task list */}
        <div style={panel}>
          <div style={panelHead}>
            ALL TASKS ({tasks.length})
            <button
              onClick={loadTasks}
              style={{
                background: 'none', border: '1px solid #1a2230',
                color: '#4a5a70', fontFamily: "'Share Tech Mono'",
                fontSize: 9, padding: '2px 8px', borderRadius: 2, cursor: 'pointer',
              }}
            >
              REFRESH
            </button>
          </div>
          <div>
            {loading ? (
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: '#4a5a70', padding: 14 }}>
                LOADING...
              </div>
            ) : tasks.length === 0 ? (
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: '#4a5a70', padding: 14, textAlign: 'center' }}>
                No tasks yet — create one on the left
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['', 'TASK', 'TYPE', 'REWARD', 'ACTIVE', ''].map((h, i) => (
                      <th key={i} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id}>
                      <td style={{ ...td, width: 30 }}>{task.icon}</td>
                      <td style={{ ...td, maxWidth: 160 }}>
                        <div style={{ fontSize: 11 }}>{task.title}</div>
                        <div style={{ fontSize: 9, color: '#4a5a70' }}>{task.slug}</div>
                      </td>
                      <td style={{ ...td, color: '#4a5a70', fontSize: 9 }}>
                        {TASK_TYPES.find(t => t.value === task.type)?.label ?? task.type}
                      </td>
                      <td style={{ ...td, color: '#f0a500', fontSize: 10 }}>
                        {Math.floor(task.reward_rtm)}
                      </td>
                      <td style={td}>
                        <div
                          onClick={() => toggleActive(task)}
                          style={{
                            width: 30, height: 17, borderRadius: 9,
                            background: task.is_active ? '#00e5a0' : '#1a2230',
                            cursor: 'pointer', position: 'relative',
                          }}
                        >
                          <div style={{
                            position: 'absolute', width: 12, height: 12,
                            background: '#fff', borderRadius: '50%',
                            top: 2.5, left: task.is_active ? 15.5 : 2.5, transition: 'left .2s',
                          }} />
                        </div>
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => startEdit(task)}
                            style={{
                              background: 'none', border: '1px solid #1a2230',
                              color: '#9d7fd4', fontFamily: "'Share Tech Mono'",
                              fontSize: 9, padding: '2px 6px', borderRadius: 2, cursor: 'pointer',
                            }}
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            style={{
                              background: 'none', border: '1px solid #3a1020',
                              color: '#ff4455', fontFamily: "'Share Tech Mono'",
                              fontSize: 9, padding: '2px 6px', borderRadius: 2, cursor: 'pointer',
                            }}
                          >
                            DEL
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20,
          background: '#0f0820', border: '1px solid #7b5ea7',
          color: '#9d7fd4', fontFamily: "'Share Tech Mono'",
          fontSize: 11, padding: '10px 16px', borderRadius: 4, zIndex: 999,
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}