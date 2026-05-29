import { getDraftAuthoringState } from '../lib/cellAuthoring.js'
import { formatCreatedAt } from '../lib/text.js'
import type { Selection } from '../lib/types.js'

/** FloatingPanels 组件需要的编辑内容、选中态和事件回调。 */
type FloatingPanelsProps = {
  draft: string
  panelStyle?: React.CSSProperties
  selection: Selection | null
  onCancelEdit: () => void
  onDraftChange: (draft: string) => void
  onSubmit: () => void
}

/**
 * 根据当前选中态渲染编辑面板或阅读面板。
 *
 * @param props 浮层需要的草稿、定位样式、选中态和操作回调。
 * @returns 编辑面板、阅读面板或空内容。
 */
export function FloatingPanels({
  draft,
  panelStyle,
  selection,
  onCancelEdit,
  onDraftChange,
  onSubmit,
}: FloatingPanelsProps) {
  const draftState = getDraftAuthoringState(draft)
  const panelClass =
    'absolute z-20 box-border rounded-lg border border-moyu-border bg-moyu-panel bg-linear-to-b from-moyu-panel-top to-moyu-panel-bottom shadow-moyu-panel backdrop-blur-2xl'

  if (selection?.mode === 'edit') {
    return (
      <section className={`${panelClass} p-[18px]`} style={panelStyle}>
        <div className="mb-2.5 text-sm leading-[1.3] text-[#c7d1da]">
          x: {selection.coord.x}, y: {selection.coord.y}
        </div>
        <textarea
          autoFocus
          maxLength={draftState.limit}
          className="block h-[98px] w-full resize-none rounded-md border border-moyu-input-border bg-moyu-field px-3.5 pt-[13px] pb-7 text-[15px] leading-normal text-[#eefdf5] outline-none placeholder:text-[#d3dde475] focus:border-moyu-focus focus:shadow-[0_0_0_3px_rgba(130,255,193,0.08)]"
          value={draft}
          placeholder="写点什么..."
          onChange={(event) => onDraftChange(event.target.value)}
        />
        <div className="pointer-events-none mt-[-30px] pr-3 text-right text-sm leading-none text-[#e0e8edb8]">
          {draftState.length} / {draftState.limit}
        </div>
        <div className="mt-5 grid grid-cols-[1fr_1.28fr] gap-3">
          <button
            type="button"
            className="h-11 rounded-md border-0 bg-transparent text-[15px] font-semibold leading-none text-[#edf6f1] hover:bg-white/6"
            onClick={onCancelEdit}
          >
            取消
          </button>
          <button
            type="button"
            className="h-11 rounded-md border-0 bg-linear-to-b from-moyu-primary-top to-moyu-primary-bottom text-[15px] font-semibold leading-none text-moyu-primary-text shadow-moyu-primary hover:from-moyu-primary-hover-top hover:to-moyu-primary-hover-bottom disabled:cursor-not-allowed disabled:bg-[rgba(120,154,142,0.5)] disabled:bg-none disabled:text-[#07362980] disabled:shadow-none"
            onClick={onSubmit}
            disabled={!draftState.canSubmit}
          >
            写入并锁定
          </button>
        </div>
      </section>
    )
  }

  if (selection?.mode === 'read') {
    return (
      <section className={`${panelClass} p-[18px]`} style={panelStyle}>
        <p className="mb-4 whitespace-pre-wrap break-anywhere text-base font-semibold leading-[1.55] text-[#e8fff2]">
          {selection.cell.content}
        </p>
        <div className="text-[13px] leading-[1.6] text-moyu-muted">坐标 x: {selection.coord.x}, y: {selection.coord.y}</div>
        <div className="text-[13px] leading-[1.6] text-moyu-muted">
          写入时间 {formatCreatedAt(selection.cell.createdAt)}
        </div>
      </section>
    )
  }

  return null
}
