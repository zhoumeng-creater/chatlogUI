import { useState, useRef, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { motion, AnimatePresence } from "framer-motion";
import { GraphEngine } from "./GraphEngine";
import { GraphTooltip } from "./GraphTooltip";
import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { useGraphStore } from "@l2/data-clerk/stores/useGraphStore";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";
import { Spinner } from "@l4/ui/Spinner";

export function GraphCanvas() {
  const graph = useGraphCommander();
  const visible = useGraphStore((s) => s.visible);
  const minimized = useGraphStore((s) => s.minimized);
  const loading = useGraphStore((s) => s.loading);
  const error = useGraphStore((s) => s.error);
  const data = useGraphStore((s) => s.data);

  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 600, height: 450 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const handleTitleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    },
    [position],
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsResizing(true);
      resizeStart.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };
    },
    [size],
  );

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
      if (isResizing) {
        setSize({
          width: Math.max(400, resizeStart.current.w + (e.clientX - resizeStart.current.x)),
          height: Math.max(300, resizeStart.current.h + (e.clientY - resizeStart.current.y)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={
          minimized
            ? { opacity: 1, scale: 1, width: 56, height: 56, borderRadius: 28 }
            : { opacity: 1, scale: 1, width: size.width, height: size.height, borderRadius: 16 }
        }
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 1000,
          overflow: "hidden",
          background: "rgba(10,10,26,0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(74,158,255,0.3)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {minimized ? (
          <div
            onClick={graph.toggleMinimize}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 24,
            }}
          >
            🕸️
          </div>
        ) : (
          <>
            <div
              onMouseDown={handleTitleMouseDown}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 12px",
                cursor: "move",
                borderBottom: "1px solid rgba(74,158,255,0.15)",
                userSelect: "none",
                flexShrink: 0,
              }}
            >
              <Typography variant="caption" weight={600} color="var(--color-text-secondary)">
                知识图谱
                {data && ` · ${data.nodes.length} 节点 · ${data.edges.length} 连线`}
              </Typography>
              <div style={{ display: "flex", gap: 4 }}>
                <AppleButton
                  variant="ghost"
                  size="sm"
                  onClick={graph.toggleMinimize}
                  style={{ padding: "0 4px", minWidth: 24, fontSize: 12 }}
                >
                  _
                </AppleButton>
                <AppleButton
                  variant="ghost"
                  size="sm"
                  onClick={graph.closeGraph}
                  style={{ padding: "0 4px", minWidth: 24, fontSize: 12 }}
                >
                  ×
                </AppleButton>
              </div>
            </div>

            <div style={{ flex: 1, position: "relative" }}>
              {loading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                    background: "rgba(10,10,26,0.6)",
                  }}
                >
                  <Spinner size={24} label="加载图谱数据..." />
                </div>
              )}

              {error && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                    background: "rgba(10,10,26,0.8)",
                    gap: 12,
                  }}
                >
                  <Typography variant="body" color="#FF3B30">
                    {error}
                  </Typography>
                  <AppleButton variant="secondary" size="sm" onClick={graph.refreshGraph}>
                    重试
                  </AppleButton>
                </div>
              )}

              <Canvas
                camera={{ position: [0, 0, 8], fov: 50 }}
                style={{ background: "#0a0a1a" }}
              >
                <GraphEngine
                  onNodeHover={graph.hoverNode}
                  onNodeDblClick={graph.selectNode}
                />
              </Canvas>
            </div>

            <GraphTooltip />

            <div
              onMouseDown={handleResizeMouseDown}
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: 16,
                height: 16,
                cursor: "nwse-resize",
              }}
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
