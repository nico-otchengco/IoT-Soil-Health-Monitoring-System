import { useEffect, useRef, useState } from "react";

const steps = [
  "Soil",
  "Sensors",
  "Aggregation",
  "Calibration",
  "Interpretation",
  "Insights",
];

export default function PipelineFlow() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation();
        }
      },
      { threshold: 0.4 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  const startAnimation = () => {
    let i = 0;

    const interval = setInterval(() => {
      setActive(i);
      i++;

      if (i >= steps.length) {
        clearInterval(interval);
      }
    }, 700);
  };

  return (
    <div ref={sectionRef} style={styles.wrapper}>
      <h2 style={styles.title}>System Pipeline</h2>

      <div style={styles.svgContainer}>
        <svg width="100%" height="120" viewBox="0 0 900 120">
          {/* FLOW LINE */}
          <line
            x1="50"
            y1="60"
            x2="850"
            y2="60"
            stroke="#c2b280"
            strokeWidth="2"
            strokeDasharray="10 10"
            style={{
              animation: "dashMove 2s linear infinite",
            }}
          />

          {/* NODES */}
          {steps.map((step, i) => {
            const x = 50 + i * 140;

            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy="60"
                  r="10"
                  fill={i <= active ? "#5f7c5a" : "#e6e0d6"}
                  style={{
                    transition: "0.3s ease",
                  }}
                />
                <text
                  x={x}
                  y="95"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#2f2a24"
                  opacity={i <= active ? 1 : 0.4}
                >
                  {step}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p style={styles.note}>
        Real-time conceptual flow of soil data transformation
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    padding: "120px 40px",
    textAlign: "center",
  },

  title: {
    fontSize: 28,
    marginBottom: 40,
  },

  svgContainer: {
    overflowX: "auto",
  },

  note: {
    marginTop: 20,
    opacity: 0.6,
    fontSize: 14,
  },
};