import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface SpringModalProps {
  children: ReactNode;
  onClose: () => void;
}

export function SpringModal({ children, onClose }: SpringModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
      }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface, #ffffff)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
