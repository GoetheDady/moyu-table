'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

type AuthModalProps = {
  isOpen: boolean
  onClose: () => void
}

type AuthMode = 'login' | 'register' | 'forgot'

const inputClass =
  'h-[42px] w-full rounded-md border border-moyu-border-soft bg-moyu-field-strong px-[11px] text-sm leading-none text-[#edfdf5] outline-none placeholder:text-[#667788] focus:border-moyu-focus focus:shadow-[0_0_0_3px_rgba(130,255,193,0.08)]'

/**
 * 登录 / 注册 / 忘记密码模态框。
 *
 * @param props 是否打开和关闭回调。
 * @returns 模态框 React 节点或 null。
 */
export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setCode('')
    setError(null)
    setCodeSent(false)
    setResetSent(false)
  }

  if (!isOpen) return null

  const handleSendCode = async () => {
    if (!email) {
      setError('请输入邮箱')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      setCodeSent(true)

      if (res.ok && process.env.NODE_ENV === 'development') {
        const data = (await res.json()) as { code?: string }
        if (data.code) {
          setError(`验证码已发送（DEV: ${data.code}）`)
        }
      }
    } catch {
      setError('发送验证码失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!email || !password || !code) {
      setError('请填写所有字段')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? '注册失败')
        setIsSubmitting(false)
        return
      }

      // 注册成功后自动登录
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        setError('注册成功，但自动登录失败，请手动登录')
        setMode('login')
      } else {
        onClose()
        resetForm()
      }
    } catch {
      setError('注册失败，请稍后再试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('请输入邮箱和密码')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('邮箱或密码错误')
      } else {
        onClose()
        resetForm()
      }
    } catch {
      setError('登录失败，请稍后再试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!email) {
      setError('请输入邮箱')
      return
    }

    setIsSubmitting(true)

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      setResetSent(true)
    } catch {
      setError('请求失败，请稍后再试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalClass =
    'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'
  const panelClass =
    'w-[340px] rounded-xl border border-moyu-border-soft bg-moyu-panel-soft shadow-moyu-dock backdrop-blur-2xl p-6'

  return (
    <div className={modalClass} onClick={onClose} aria-label="登录面板">
      <div className={panelClass} onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-5 text-lg font-bold leading-none text-[#e8fff2]">
          {mode === 'login' ? '登录' : mode === 'register' ? '注册' : '忘记密码'}
        </h2>

        {resetSent ? (
          <div className="text-center">
            <p className="mb-4 text-sm leading-relaxed text-[#c7d1da]">
              如果该邮箱已注册，重置链接已发送，请查收邮件。
            </p>
            <button
              type="button"
              className="text-sm font-semibold text-moyu-muted underline hover:text-[#c7d6de]"
              onClick={() => {
                setMode('login')
                resetForm()
              }}
            >
              返回登录
            </button>
          </div>
        ) : (
          <form
            onSubmit={
              mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleForgotPassword
            }
            className="grid gap-3.5"
          >
            <input
              type="email"
              placeholder="邮箱"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />

            {mode !== 'forgot' && (
              <input
                type="password"
                placeholder="密码"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            )}

            {mode === 'register' && (
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="验证码"
                  maxLength={6}
                  className={inputClass}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                />
                <button
                  type="button"
                  className="h-[42px] shrink-0 rounded-md bg-white/8 px-3 text-xs font-semibold leading-none text-[#c7d6de] hover:bg-white/12 disabled:opacity-40"
                  onClick={handleSendCode}
                  disabled={isSubmitting || !email}
                >
                  {codeSent ? '重发' : '发送验证码'}
                </button>
              </div>
            )}

            {error && (
              <p role="alert" className="text-[13px] font-semibold leading-snug text-[#ffd28f]">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-1 h-[44px] w-full rounded-lg bg-linear-to-b from-moyu-primary-top to-moyu-primary-bottom text-[15px] font-semibold leading-none text-moyu-primary-text shadow-moyu-primary hover:from-moyu-primary-hover-top hover:to-moyu-primary-hover-bottom disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? '请稍候...'
                : mode === 'login'
                  ? '登录'
                  : mode === 'register'
                    ? '注册'
                    : '发送重置链接'}
            </button>
          </form>
        )}

        {!resetSent && (
          <div className="mt-4 flex justify-center gap-4 text-xs font-semibold text-moyu-muted">
            {mode === 'login' ? (
              <>
                <button
                  type="button"
                  className="underline hover:text-[#c7d6de]"
                  onClick={() => {
                    setMode('register')
                    setError(null)
                    setCodeSent(false)
                  }}
                >
                  注册
                </button>
                <button
                  type="button"
                  className="underline hover:text-[#c7d6de]"
                  onClick={() => {
                    setMode('forgot')
                    setError(null)
                  }}
                >
                  忘记密码
                </button>
              </>
            ) : (
              <button
                type="button"
                className="underline hover:text-[#c7d6de]"
                onClick={() => {
                  setMode('login')
                  setError(null)
                }}
              >
                返回登录
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
