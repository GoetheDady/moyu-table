import { useCallback, useEffect, useRef } from 'react'
import { JUMP_ANIMATION_MS } from '../../domain/cells/constants'
import { clamp, easeInOutCubic } from '../../domain/cells/geometry'
import type { Camera } from '../../domain/cells/types'

/**
 * 相机跳转动画 Hook。
 *
 * 管理 requestAnimationFrame 生命周期，逐帧插值当前相机位置到目标位置。
 *
 * @param camera 当前相机位置。
 * @param onCameraChange 目标相机更新回调。
 * @returns animateCameraTo 和 cancelJumpAnimation。
 */
export function useCameraJump(camera: Camera, onCameraChange: (camera: Camera) => void) {
  const jumpAnimationRef = useRef<number | null>(null)

  const cancelJumpAnimation = useCallback(() => {
    if (jumpAnimationRef.current !== null) {
      cancelAnimationFrame(jumpAnimationRef.current)
      jumpAnimationRef.current = null
    }
  }, [])

  const animateCameraTo = useCallback(
    (targetCamera: Camera) => {
      cancelJumpAnimation()

      const startCamera = camera
      const startedAt = performance.now()

      const step = (now: number) => {
        const progress = clamp((now - startedAt) / JUMP_ANIMATION_MS, 0, 1)
        const easedProgress = easeInOutCubic(progress)

        onCameraChange({
          x: startCamera.x + (targetCamera.x - startCamera.x) * easedProgress,
          y: startCamera.y + (targetCamera.y - startCamera.y) * easedProgress,
        })

        if (progress < 1) {
          jumpAnimationRef.current = requestAnimationFrame(step)
        } else {
          jumpAnimationRef.current = null
        }
      }

      jumpAnimationRef.current = requestAnimationFrame(step)
    },
    [camera, cancelJumpAnimation, onCameraChange],
  )

  useEffect(() => cancelJumpAnimation, [cancelJumpAnimation])

  return { animateCameraTo, cancelJumpAnimation }
}
