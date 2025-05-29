"use client";
import { motion } from "framer-motion";

const FadeInSection = ({ 
  children, 
  threshold = 0.05, // Lower threshold means less of component needs to be visible
  delay = 0.1 
}: { 
  children: React.ReactNode, 
  threshold?: number,
  delay?: number 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} // Reduced distance for more subtle animation
      whileInView={{ 
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.6, // Shorter duration
          delay: delay,
          ease: [0.2, 0.65, 0.3, 0.9], // Custom easing curve
          // Separate properties for better performance
          opacity: { duration: 0.5 },
          y: { type: "spring", stiffness: 50, damping: 15 }
        }
      }}
      viewport={{ once: true, amount: threshold }}
      style={{
        willChange: "opacity, transform",
        backfaceVisibility: "hidden"
      }}
    >
      {children}
    </motion.div>
  );
};

export default FadeInSection;