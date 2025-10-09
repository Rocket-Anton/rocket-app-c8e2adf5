import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface MotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const MotionDialog = ({
  open,
  onOpenChange,
  children,
  className,
}: MotionDialogProps) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal forceMount>
        <AnimatePresence>
          {open && (
            <>
              {/* Overlay - static, no animation */}
              <Dialog.Overlay asChild>
                <div 
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                  style={{ zIndex: 10090 }}
                />
              </Dialog.Overlay>

              {/* Viewport-Grid - pixelgenaue Zentrierung */}
              <div className="fixed inset-0 z-[10140] grid place-items-center p-4 sm:p-6 pointer-events-none">
                <Dialog.Content asChild>
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    className={cn(
                      "pointer-events-auto isolate",
                      "w-[92vw] sm:w-[95vw] max-w-2xl h-[85vh] sm:h-[80vh]",
                      "rounded-xl bg-background shadow-2xl overflow-hidden",
                      "flex flex-col min-h-0",
                      "transform-gpu will-change-[transform,opacity]",
                      className
                    )}
                    style={{
                      contain: 'layout style paint',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden'
                    }}
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: {
                        opacity: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
                        scale: {
                          type: "spring",
                          stiffness: 380,
                          damping: 32,
                          mass: 0.8
                        },
                        y: {
                          type: "spring",
                          stiffness: 380,
                          damping: 32,
                          mass: 0.8
                        }
                      }
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.98,
                      y: 6,
                      transition: {
                        duration: 0.12,
                        ease: [0.4, 0, 1, 1]
                      }
                    }}
                  >
                    {children}
                  </motion.div>
                </Dialog.Content>
              </div>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
