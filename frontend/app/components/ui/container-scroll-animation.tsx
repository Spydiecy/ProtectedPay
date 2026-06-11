"use client";

import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // As user scrolls: card tilts from 20° → 0°, scales up slightly, title slides up
  const rotate    = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale     = useTransform(scrollYProgress, [0, 1], isMobile ? [0.75, 0.95] : [1.05, 1]);
  // Title slides up enough to be covered by the card as it comes in
  const translate = useTransform(scrollYProgress, [0, 1], [0, -160]);

  return (
    <div
      ref={containerRef}
      style={{
        height: isMobile ? '56rem' : '76rem',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        position: 'relative',
        padding: isMobile ? '8px 16px' : '0 80px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          paddingTop: isMobile ? '80px' : '100px',
          width: '100%',
          position: 'relative',
          perspective: '1000px',
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  titleComponent,
}: {
  translate: MotionValue<number>;
  titleComponent: React.ReactNode;
}) => (
  <motion.div
    style={{
      translateY: translate,
      maxWidth: '72rem',
      margin: '0 auto',
      textAlign: 'center',
      width: '100%',
      // Enough bottom padding so buttons are visible before scroll starts
      paddingBottom: '48px',
    }}
  >
    {titleComponent}
  </motion.div>
);

export const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => (
  <motion.div
    style={{
      rotateX: rotate,
      scale,
      maxWidth: '72rem',
      // Small negative margin so card starts just below buttons, not far away
      marginTop: '-16px',
      marginLeft: 'auto',
      marginRight: 'auto',
      height: '40rem',
      width: '100%',
      border: '3px solid var(--border)',
      padding: '8px',
      background: 'var(--surface-card)',
      borderRadius: '28px',
      boxShadow:
        '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a',
    }}
  >
    <div
      style={{
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        borderRadius: '20px',
        background: 'var(--surface-elevated)',
      }}
    >
      {children}
    </div>
  </motion.div>
);
