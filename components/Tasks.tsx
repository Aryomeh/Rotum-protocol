'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase'

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
}

interface UserTask {
  task_id:      number
  completed_at: string
  reward_paid:  number
}

interface TaskWithStatus extends Task {
  completed:   boolean
  progress:    number
  canClaim:    boolean
}

export default function Tasks() {
  const { user, setUser }         = useStore()
  const [tasks, setTasks]         = useState<TaskWithStatus[]>([])
  const [loading, setLoading]     = useState(true)
  const [claiming, setClaiming]   = useState<number | null>(null)
  const [toast, setToast]         = useState<string | null>(null)

  useEffect(() => { if (user) loadTasks() }, [user])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  async function loadTasks() {
    if (!user) return
    setLoading(true)

    const [tasksRes, userTasksRes, referralsRes, nodesRes, purchasesRes, rankRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('is_active', true).order('id'),
      supabase.from('user_tasks').select('*').eq('user_id', user.id),
      supabase.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', user.id),
      supabase.from('user_nodes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed'),
      supabase.from('season_rankings').select('rank').eq('user_id', user.id).single(),
    ])

    const completedIds = new Set((userTasksRes.data ?? []).map((ut: UserTask) => ut.task_id))
    const referralCount = referralsRes.count ?? 0
    const nodeCount     = nodesRes.count ?? 0
    const purchaseCount = purchasesRes.count ?? 0
    const userRank      = rankRes.data?.rank ?? 999999

    const enriched: TaskWithStatus[] = (tasksRes.data ?? []).map((task: Task) => {
      const completed = completedIds.has(task.id)
      let progress    = 0
      let canClaim    = false

      if (!completed) {
        switch (task.type) {
          case 'referral':
            progress = Math.min(task.target, referralCount)
            canClaim = referralCount >= task.target
            break
          case 'nodes':
            progress = Math.min(task.target, nodeCount)
            canClaim = nodeCount >= task.target
            break
          case 'purchase':
            progress = Math.min(task.target, purchaseCount)
            canClaim = purchaseCount >= task.target
            break
          case 'ranking':
            progress = userRank <= task.target ? task.target : 0
            canClaim = userRank <= task.target
            break
          case 'daily':
            const lastActive = user.last_active_at ? new Date(user.last_active_at) : null
            const today      = new Date()
            const sameDay    = lastActive
              ? lastActive.toDateString() === today.toDateString()
              : false
            progress = sameDay ? 1 : 0
            canClaim = sameDay
            break
          case 'channel':
          case 'manual':
            progress = 0
            canClaim = false
            break
        }
      }

      return { ...task, completed, progress, canClaim }
    })

    setTasks(enriched)
    setLoading(false)
  }

  async function claimTask(task: TaskWithStatus) {
    if (!user || claiming) return
    setClaiming(task.id)

    try {
      const res  = await fetch('/api/tasks/claim', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, taskId: task.id }),
      })
      const json = await res.json()

      if (!json.success) {
        showToast(json.error ?? 'Failed to claim')
      } else {
        showToast(`✓ +${Math.floor(task.reward_rtm)} $RTM claimed!`)
        setUser({ ...user, rtm_balance: user.rtm_balance + task.reward_rtm })
        loadTasks()
      }
    } catch {
      showToast('Network error')
    }
    setClaiming(null)
  }

  async function handleChannelTask() {
    const twa = (window as any).Telegram?.WebApp
    if (twa?.openTelegramLink) {
      twa.openTelegramLink('https://t.me/rotumprotocol')
    }
    // After opening, allow manual claim
    showToast('Join the channel then tap VERIFY')
  }

  async function verifyChannel(task: TaskWithStatus) {
    if (!user || claiming) return
    setClaiming(task.id)
    try {
      const res  = await fetch('/api/tasks/verify-channel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, taskId: task.id, telegramId: user.telegram_id }),
      })
      const json = await res.json()
      if (!json.success) showToast(json.error ?? 'Not a member yet')
      else {
        showToast(`✓ +${Math.floor(task.reward_rtm)} $RTM claimed!`)
        setUser({ ...user, rtm_balance: user.rtm_balance + task.reward_rtm })
        loadTasks()
      }
    } catch {
      showToast('Network error')
    }
    setClaiming(null)
  }

  const completed = tasks.filter(t => t.completed)
  const pending   = tasks.filter(t => !t.completed)

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{
        fontFamily: "'Share Tech Mono'", fontSize: 9,
        color: 'var(--rtm-muted)', letterSpacing: '3px',
        marginBottom: 10,
      }}>
        TASKS & REWARDS
      </div>

      {loading ? (
        <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: 'var(--rtm-muted)', textAlign: 'center', padding: '20px 0' }}>
          LOADING TASKS...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pending.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              claiming={claiming === task.id}
              onClaim={() => task.type === 'channel' ? verifyChannel(task) : claimTask(task)}
              onJoinChannel={() => handleChannelTask()}
            />
          ))}

          {completed.length > 0 && (
            <>
              <div style={{
                fontFamily: "'Share Tech Mono'", fontSize: 9,
                color: 'var(--rtm-muted)', letterSpacing: '2px',
                padding: '8px 0 4px',
                borderTop: '1px solid var(--rtm-border)',
              }}>
                COMPLETED ({completed.length})
              </div>
              {completed.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  claiming={false}
                  onClaim={() => {}}
                  onJoinChannel={() => {}}
                />
              ))}
            </>
          )}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function TaskCard({ task, claiming, onClaim, onJoinChannel }: {
  task:          TaskWithStatus
  claiming:      boolean
  onClaim:       () => void
  onJoinChannel: () => void
}) {
  const showProgress = !task.completed && task.target > 1
  const pct          = showProgress ? Math.min(100, (task.progress / task.target) * 100) : 0

  return (
    <div style={{
      background:   'var(--rtm-card)',
      border:       `1px solid ${task.completed ? '#1a3a25' : 'var(--rtm-border)'}`,
      borderRadius: 6,
      padding:      '10px 12px',
      opacity:      task.completed ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 4,
          background: task.completed ? '#0a2a14' : '#0f0820',
          border: `1px solid ${task.completed ? '#1a4a25' : 'var(--rtm-border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          {task.icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Rajdhani'", fontSize: 14, fontWeight: 600, color: task.completed ? 'var(--rtm-green)' : 'var(--rtm-text)' }}>
            {task.completed && '✓ '}{task.title}
          </div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', marginTop: 1 }}>
            {task.description}
          </div>

          {/* Progress bar */}
          {showProgress && (
            <div style={{ marginTop: 6 }}>
              <div style={{ height: 3, background: '#1a2230', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: pct + '%',
                  background: 'var(--rtm-purple)', borderRadius: 2,
                  transition: 'width .5s ease',
                }} />
              </div>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', marginTop: 2 }}>
                {task.progress} / {task.target}
              </div>
            </div>
          )}
        </div>

        {/* Right side */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 12, color: 'var(--rtm-amber)', fontWeight: 700, marginBottom: 4 }}>
            +{Math.floor(task.reward_rtm)} $RTM
          </div>

          {task.completed ? (
            <span style={{
              fontFamily: "'Share Tech Mono'", fontSize: 9,
              color: 'var(--rtm-green)', background: '#0a2a14',
              border: '1px solid #1a4a25', padding: '2px 7px', borderRadius: 2,
            }}>
              DONE
            </span>
          ) : task.type === 'channel' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                onClick={onJoinChannel}
                style={{
                  background: '#0a1020', border: '1px solid #0088cc',
                  color: '#00aaff', fontFamily: "'Share Tech Mono'",
                  fontSize: 9, padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
                }}
              >
                JOIN
              </button>
              <button
                onClick={onClaim}
                disabled={claiming}
                style={{
                  background: '#0f0820', border: '1px solid var(--rtm-accent)',
                  color: 'var(--rtm-purple)', fontFamily: "'Share Tech Mono'",
                  fontSize: 9, padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
                }}
              >
                {claiming ? '...' : 'VERIFY'}
              </button>
            </div>
          ) : task.canClaim ? (
            <button
              onClick={onClaim}
              disabled={claiming}
              style={{
                background: '#0a2a14', border: '1px solid var(--rtm-green)',
                color: 'var(--rtm-green)', fontFamily: "'Share Tech Mono'",
                fontSize: 10, padding: '4px 10px', borderRadius: 2,
                cursor: claiming ? 'not-allowed' : 'pointer',
              }}
            >
              {claiming ? '...' : 'CLAIM'}
            </button>
          ) : (
            <span style={{
              fontFamily: "'Share Tech Mono'", fontSize: 9,
              color: 'var(--rtm-muted)', background: '#080a0f',
              border: '1px solid var(--rtm-border)', padding: '2px 7px', borderRadius: 2,
            }}>
              LOCKED
            </span>
          )}
        </div>
      </div>
    </div>
  )
}