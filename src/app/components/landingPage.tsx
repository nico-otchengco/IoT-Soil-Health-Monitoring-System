import { useEffect, useRef, useState } from "react";

export default function LandingPage() {
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const setRef = (el: HTMLElement | null, index: number) => {
    sectionsRef.current[index] = el;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute("data-index"));
          if (entry.isIntersecting) {
            setActiveIndex(index);
          }
        });
      },
      { threshold: 0.5 }
    );

    sectionsRef.current.forEach((sec) => {
      if (sec) observer.observe(sec);
    });

    return () => observer.disconnect();
  }, []);

    function PipelineSVG({ active }: { active: boolean }) {
        const [progress, setProgress] = useState(0);

        useEffect(() => {
            if (!active) return;

            let frame = 0;
            const total = 120;

            const animate = () => {
                frame++;
                setProgress(frame / total);

                if (frame < total) requestAnimationFrame(animate);
            };

            requestAnimationFrame(animate);
        }, [active]);

        const nodes = [
            "Soil",
            "Sensors",
            "Aggregation",
            "Calibration",
            "Interpretation",
            "Insights",
        ];

        return (
            <div style={{ marginTop: 60 }}>
                <svg viewBox="0 0 800 140" width="100%">

                    {/* BASE LINE */}
                    <line
                        x1="50"
                        y1="70"
                        x2="750"
                        y2="70"
                        stroke="#c2b280"
                        strokeWidth="2"
                        strokeDasharray="8 8"
                    />

                    {/* MAIN DATA PACKET */}
                    <circle
                        r="6"
                        fill="#5f7c5a"
                        cx={50 + 700 * progress}
                        cy="70"
                        style={{
                            filter: "drop-shadow(0 0 6px #5f7c5a)",
                            transition: "0.1s linear",
                        }}
                    />

                    {/* TRAIL PARTICLE (lag effect = realism) */}
                    <circle
                        r="4"
                        fill="#4b3f2f"
                        cx={50 + 700 * Math.max(0, progress - 0.12)}
                        cy="70"
                        opacity={0.7}
                    />

                    {/* NODES */}
                    {nodes.map((n, i) => {
                        const x = 50 + i * 130;
                        const isActive = progress * nodes.length >= i;

                        return (
                            <g key={i}>
                                <circle
                                    cx={x}
                                    cy="70"
                                    r="10"
                                    fill={isActive ? "#5f7c5a" : "#e6e0d6"}
                                    style={{ transition: "0.3s ease" }}
                                />

                                <text
                                    x={x}
                                    y="110"
                                    textAnchor="middle"
                                    fontSize="12"
                                    fill="#2f2a24"
                                    opacity={isActive ? 1 : 0.4}
                                >
                                    {n}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        );
    }

  return (
    <div className="page">
      {/* HERO */}
      <section className="hero">
        <p className="tagline">Soil is not data. It is a system.</p>
        <h1>
          Agronomic intelligence for <span>precision soil understanding</span>
        </h1>
        <p className="sub">
          SmartSoil interprets environmental signals into meaningful soil behavior.
        </p>
        <button className="cta">Enter System</button>
      </section>

      {/* PIPELINE STORY */}
      <section
        ref={(el) => setRef(el, 0)}
        data-index={0}
        className={`section ${activeIndex === 0 ? "active" : ""}`}
      >
        <h2>1. Soil Input Layer</h2>
        <p>Physical soil conditions captured through sensors.</p>
      </section>

      <section
        ref={(el) => setRef(el, 1)}
        data-index={1}
        className={`section ${activeIndex === 1 ? "active" : ""}`}
      >
        <h2>2. Sensor Translation</h2>
        <p>Raw signals converted into measurable attributes.</p>
      </section>

      <section
        ref={(el) => setRef(el, 2)}
        data-index={2}
        className={`section ${activeIndex === 2 ? "active" : ""}`}
      >
        <h2>3. Data Flow System</h2>
        <p>Real-time transformation of soil signals into structured agronomic intelligence.</p>

        <PipelineSVG active={activeIndex >= 2} />
      </section>

      <section
        ref={(el) => setRef(el, 3)}
        data-index={3}
        className={`section ${activeIndex === 3 ? "active" : ""}`}
      >
        <h2>4. Agronomic Interpretation</h2>
        <p>Conversion into soil behavior categories.</p>
      </section>

      <section
        ref={(el) => setRef(el, 4)}
        data-index={4}
        className={`section ${activeIndex === 4 ? "active" : ""}`}
      >
        <h2>5. Insight Layer</h2>
        <p>Decision-ready outputs for agriculture planning.</p>
      </section>

      {/* INSIGHT */}
      <section className="insight">
        <div className="card">
          <p>Moisture: 42%</p>
          <span>→ Slightly dry soil, irrigation recommended within 6–12 hours</span>
        </div>
      </section>

      {/* STYLE */}
      <style>{`
        .page{
          font-family: Inter, sans-serif;
          background:#f6f3ed;
          color:#2f2a24;
          min-height:100vh;
        }

        .hero{
          padding:120px 40px;
          text-align:center;
        }

        .tagline{
          opacity:0.6;
        }

        h1{
          font-size:48px;
          line-height:1.1;
          margin-top:20px;
        }

        h1 span{
          color:#5f7c5a;
        }

        .sub{
          margin-top:20px;
          opacity:0.7;
        }

        .cta{
          margin-top:30px;
          padding:12px 20px;
          background:#4b3f2f;
          color:white;
          border:none;
          cursor:pointer;
          transition:0.3s ease;
        }

        .cta:hover{
          transform:translateY(-2px);
        }

        .section{
          padding:120px 40px;
          border-top:1px solid #e6e0d6;
          opacity:0.3;
          transform:translateY(20px);
          transition:0.6s ease;
        }

        .section.active{
          opacity:1;
          transform:translateY(0);
        }

        .insight{
          padding:100px 40px;
          text-align:center;
        }

        .card{
          display:inline-block;
          padding:20px;
          background:white;
          border:1px solid #e6e0d6;
          border-radius:12px;
          transition:0.3s ease;
        }

        .card:hover{
          transform:translateY(-5px);
        }
      `}</style>
    </div>
  );
}
