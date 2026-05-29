/** JumpDock 组件需要的坐标输入状态和事件回调。 */
type JumpDockProps = {
  isOpen: boolean
  jumpX: string
  jumpY: string
  onJumpXChange: (value: string) => void
  onJumpYChange: (value: string) => void
  onOpenChange: (isOpen: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

/**
 * 渲染左下角坐标跳转控件。
 *
 * @param props 跳转控件的展开状态、坐标输入值和表单回调。
 * @returns 坐标按钮或展开后的跳转表单。
 */
export function JumpDock({
  isOpen,
  jumpX,
  jumpY,
  onJumpXChange,
  onJumpYChange,
  onOpenChange,
  onSubmit,
}: JumpDockProps) {
  const dockSurface =
    'border border-moyu-border-soft bg-moyu-panel-soft bg-linear-to-b from-moyu-panel-soft-top to-moyu-panel-soft-bottom shadow-moyu-dock backdrop-blur-2xl'
  const compactButton =
    'rounded-lg font-semibold leading-none transition-colors'

  return (
    <section className="absolute bottom-[18px] left-[18px] z-30">
      {!isOpen ? (
        <button
          type="button"
          className={`${dockSurface} ${compactButton} h-[38px] min-w-16 px-3.5 text-sm text-[#e4f5edd6] hover:border-moyu-focus hover:text-[#eafff4]`}
          onClick={() => onOpenChange(true)}
        >
          坐标
        </button>
      ) : (
        <form className={`${dockSurface} w-[238px] rounded-lg p-3`} onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="grid gap-1.5 text-xs leading-none text-moyu-muted">
              x
              <input
                type="number"
                inputMode="numeric"
                className="h-[34px] w-full rounded-md border border-moyu-border-soft bg-moyu-field-strong px-[9px] font-mono text-sm font-semibold leading-none text-[#edfdf5] outline-none focus:border-moyu-focus focus:shadow-[0_0_0_3px_rgba(130,255,193,0.08)]"
                value={jumpX}
                onChange={(event) => onJumpXChange(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-xs leading-none text-moyu-muted">
              y
              <input
                type="number"
                inputMode="numeric"
                className="h-[34px] w-full rounded-md border border-moyu-border-soft bg-moyu-field-strong px-[9px] font-mono text-sm font-semibold leading-none text-[#edfdf5] outline-none focus:border-moyu-focus focus:shadow-[0_0_0_3px_rgba(130,255,193,0.08)]"
                value={jumpY}
                onChange={(event) => onJumpYChange(event.target.value)}
              />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              className={`${compactButton} h-[34px] bg-white/4 text-[13px] text-[#edf6f1d6] hover:bg-white/8`}
              onClick={() => onOpenChange(false)}
            >
              收起
            </button>
            <button
              type="submit"
              className={`${compactButton} h-[34px] bg-linear-to-b from-moyu-primary-top to-moyu-primary-bottom text-[13px] text-moyu-primary-text hover:from-moyu-primary-hover-top hover:to-moyu-primary-hover-bottom`}
            >
              跳转
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
