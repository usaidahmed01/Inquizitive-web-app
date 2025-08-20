"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

const spring = { damping: 30, stiffness: 100, mass: 2 };

export default function TiltedCard({
  imageSrc,
  altText = "Tilted card image",
  containerHeight = "260px",
  containerWidth = "100%",
  imageHeight = "260px",
  imageWidth = "100%",
  scaleOnHover = 1.04,
  rotateAmplitude = 10,
  // we’ll keep these off by default for your use-case
  showMobileWarning = false,
  showTooltip = false,
  captionText = "",
  displayOverlayContent = false,
  overlayContent = null,
}) {
  const ref = useRef(null);

  // stable motion values (don’t recreate on each render)
  const baseRX = useMotionValue(0);
  const baseRY = useMotionValue(0);
  const rotateX = useSpring(baseRX, spring);
  const rotateY = useSpring(baseRY, spring);
  const scale = useSpring(1, spring);

  const [lastY, setLastY] = useState(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const tooltipOpacity = useSpring(0);
  const tooltipRotate = useSpring(0, { stiffness: 350, damping: 30, mass: 1 });

  function handleMouse(e) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    baseRX.set((offsetY / (rect.height / 2)) * -rotateAmplitude);
    baseRY.set((offsetX / (rect.width / 2)) * rotateAmplitude);

    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);

    const vY = offsetY - lastY;
    tooltipRotate.set(-vY * 0.6);
    setLastY(offsetY);
  }

  function handleEnter() {
    scale.set(scaleOnHover);
    tooltipOpacity.set(1);
  }

  function handleLeave() {
    scale.set(1);
    baseRX.set(0);
    baseRY.set(0);
    tooltipOpacity.set(0);
    tooltipRotate.set(0);
  }

  return (
    <figure
      ref={ref}
      className="relative w-full h-full [perspective:900px] flex justify-center items-center"
      style={{ height: containerHeight, width: containerWidth }}
      onMouseMove={handleMouse}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {showMobileWarning && (
        <div className="absolute top-4 text-center text-sm block sm:hidden">
          This effect is not optimized for mobile. Check on desktop.
        </div>
      )}

      <motion.div
        className="relative z-0 w-full h-full overflow-hidden rounded-[15px] [transform-style:preserve-3d]"
        style={{ width: imageWidth, height: imageHeight, rotateX, rotateY, scale }}
      >
        {/* gradient “image” */}
        <motion.img
          src={imageSrc}
          alt={altText}
          className="absolute inset-0 z-[1] w-full h-full object-cover rounded-[15px]"
          style={{ transform: "translateZ(0)" }}
        />

        {/* overlay layer inside the card */}
        {displayOverlayContent && overlayContent && (
          <motion.div
            className="absolute inset-0 z-[2] pointer-events-none"
            style={{ transform: "translateZ(40px)" }}
          >
            {overlayContent}
          </motion.div>
        )}
      </motion.div>

      {/* optional tooltip */}
      {showTooltip && (
        <motion.figcaption
          className="pointer-events-none absolute left-0 top-0 rounded-[4px] bg-white px-[10px] py-[4px] text-[10px] text-[#2d2d2d] z-[3] hidden sm:block"
          style={{ x: mouseX, y: mouseY, opacity: tooltipOpacity, rotate: tooltipRotate }}
        >
          {captionText}
        </motion.figcaption>
      )}
    </figure>
  );
}
