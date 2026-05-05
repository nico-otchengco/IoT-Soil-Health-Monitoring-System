import { useEffect, useMemo, useState } from 'react';
import { sb } from '../../../utils/SBClient';
import type { Crop } from '../../../type/type';

import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';

// Hist row type (sens_rdg_10m)
type HistRow = {
  bkt_10m: string;
  crop: Crop;
  ph: number | null;
  moist_pct: number | null;
  temp_c: number | null;
  ec_ms: number | null;
  n_mgkg: number | null;
  p_mgkg: number | null;
  k_mgkg: number | null;
};

type TimeWin = '24h' | '7d' | '30d';

const TIME_OPTS: { key: TimeWin; label: string; hours: number }[] = [
  { key: '24h', label: 'Last 24 hours', hours: 24 },
  { key: '7d',  label: 'Last 7 days',   hours: 24 * 7 },
  { key: '30d', label: 'Last 30 days',  hours: 24 * 30 },
];

// Summary cfg for each param
const SUM_PARAMS = [
  { key: 'moist_pct' as const, label: 'Moisture',   unit: '%' },
  { key: 'temp_c'    as const, label: 'Temp',       unit: '°C' },
  { key: 'ec_ms'     as const, label: 'EC',         unit: 'mS/cm' },
  { key: 'ph'        as const, label: 'pH',         unit: '' },
  { key: 'n_mgkg'     as const, label: 'N',          unit: 'mg/kg' },
  { key: 'p_mgkg'     as const, label: 'P',          unit: 'mg/kg' },
  { key: 'k_mgkg'     as const, label: 'K',          unit: 'mg/kg' },
];

type SumStat = { 
  key: string; 
  label: string; 
  unit: string; 
  min: number | null; 
  max: number | null; 
  avg: number | null; 
  last: number | null; 
};


export default function Analytics() {
  const [crop, setCrop] = useState<Crop>('pechay');
  const [win, setWin] = useState<TimeWin>('24h');
  const [rows, setRows] = useState<HistRow[]>([]);
  const [loading, setLoading] = useState(false);

  

  // Load hist rows when crop or win changes
  useEffect(() => {
    (async () => {
      setLoading(true);

      const cfg = TIME_OPTS.find(t => t.key === win)!;
      const from = new Date(Date.now() - cfg.hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await sb
        .from('sens_rdg_10m')
        .select(
          'bkt_10m, crop, ph, moist_pct, temp_c, ec_ms, n_mgkg, p_mgkg, k_mgkg',
        )
        .eq('crop', crop)
        .gte('bkt_10m', from)
        .order('bkt_10m', { ascending: true });

      if (error) {
        console.error('err_load_hist', error);
        setRows([]);
      } else {
        setRows((data as any[]).map((r) => ({
          ...r,
          // ensure numeric conversion
          ph:        r.ph        !== null ? Number(r.ph)        : null,
          moist_pct: r.moist_pct !== null ? Number(r.moist_pct) : null,
          temp_c:    r.temp_c    !== null ? Number(r.temp_c)    : null,
          ec_ms:     r.ec_ms     !== null ? Number(r.ec_ms)     : null,
          n_mgkg:     r.n_mgkg     !== null ? Number(r.n_mgkg)     : null,
          p_mgkg:     r.p_mgkg     !== null ? Number(r.p_mgkg)     : null,
          k_mgkg:     r.k_mgkg     !== null ? Number(r.k_mgkg)     : null,
        })));
      }

      setLoading(false);
    })();
  }, [crop, win]);
  
  const stats: SumStat[] = useMemo(() => {
    if (!rows.length) return [];
    
    return SUM_PARAMS.map((p) => {
      const vals = rows 
      .map((r) => r[p.key]) 
      .filter((v): v is number => v !== null && !Number.isNaN(v));
      
      if (!vals.length) {
        return {
          key: p.key,
          label: p.label,
          unit: p.unit,
          min: null, max: null,
          avg: null,
          last: null, 
        };
      } 
      const min = Math.min(...vals); 
      const max = Math.max(...vals); 
      const sum = vals.reduce((acc, v) => acc + v, 0); 
      const avg = sum / vals.length; 
      const lastRaw = rows[rows.length - 1][p.key]; 
      const last = typeof lastRaw === 'number' ? lastRaw : null; 
      
      return { key: p.key, label: p.label, unit: p.unit, min, max, avg, last, }; }); }, 
      [rows]);
  
  const graphData = useMemo(() => {
    return stats.map((s) => ({
      label: s.label,
      min: s.min ?? 0,
      max: s.max ?? 0,
      avg: s.avg ?? 0,
    }));
  }, [stats]);

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        t: new Date(r.bkt_10m).toLocaleString(),
        ph: r.ph,
        moist_pct: r.moist_pct,
        temp_c: r.temp_c,
        ec_ms: r.ec_ms,
        n_mgkg: r.n_mgkg,
        p_mgkg: r.p_mgkg,
        k_mgkg: r.k_mgkg,
      })),
    [rows],
  );

  return (
    <>
      <div className="row">
        <h2 className="sens-title">Analytics</h2>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: 13, marginRight: 6 }}>Crop:</label>
            <select
              className="select"
              value={crop}
              onChange={(e) => setCrop(e.target.value as Crop)}
            >
              <option value="pechay">Pechay</option>
              <option value="lemongrass">Lemongrass</option>
              <option value="okra">Okra</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 13, marginRight: 6 }}>Window:</label>
            <select
              className="select"
              value={win}
              onChange={(e) => setWin(e.target.value as TimeWin)}
            >
              {TIME_OPTS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ fontSize: 13, color: 'var(--light-gray)', marginTop: '0.5rem' }}>
          Loading analytics…
        </div>
      )}

      {!loading && !rows.length && (
        <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: '0.5rem' }}>
          No logged data in this time range for {crop}. Make sure the device has
          been running long enough to produce 30-minute logs.
        </div>
      )}

      {/* Charts row */}
      {chartData.length > 0 && (
        <div className="an-chart-grid">
          {/* Moisture, Temp, EC Trend */}
          <div className="an-chart-card">
            <div className="an-chart-title">Moisture / Temp / EC</div>
            <div className="an-chart-inner">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id = "moistGradient" x1 = "40%" y1 = "10%" x2 = "60%" y2 = "100%">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
                      <stop offset="100%" stopColor="var(--white)" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id = "tempGradient" x1 = "40%" y1 = "10%" x2 = "60%" y2 = "100%">
                      <stop offset="20%" stopColor="var(--brown)" stopOpacity={1} />
                      <stop offset="100%" stopColor="var(--white)" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="moist_pct" name="Moisture (%)" stroke="var(--chart-1)" dot={false} fill = "url(#moistGradient)" />
                  <Line type="monotone" dataKey="temp_c" name="Temp (°C)" stroke="var(--brown)" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="ec_ms" name="EC (mS/cm)" stroke="var(--amber-glow)" dot={false} strokeWidth={1.5}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* NPK Trend (Stacked Area Chart) */}
          <div className="an-chart-card">
            <div className="an-chart-title">NPK Trend</div>
            <div className="an-chart-inner">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id = "nTrend" x1= "40%" y1= "10%" x2= "60%" y2= "100%">
                      <stop offset= "0%" stopColor='var(--brown)' stopOpacity={1} />
                      <stop offset= "100%" stopColor='var(--white)' stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id = "pTrend" x1= "40%" y1= "10%" x2= "60%" y2= "100%">
                      <stop offset= "0%" stopColor='var(--amber-glow)' stopOpacity={1} />
                      <stop offset= "100%" stopColor='var(--white)' stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="n_mgkg" name="Nitrogen (mg/kg)" dot={false} stroke="var(--brown)" strokeWidth={1.5}/>
                  <Area type="monotone" dataKey="p_mgkg" name="Phosphorus (mg/kg)" dot={false} stroke="var(--amber-glow)" fill='url(#pTrend)'/>
                  <Line type="monotone" dataKey="k_mgkg" name="Potassium (mg/kg)" dot={false} stroke="var(--chart-1)" strokeWidth={1.5}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Moisture Distribution (Bar Chart) */}
          <div className="an-chart-card">
            <div className="an-chart-title">Moisture Distribution</div>
            <div className="an-chart-inner">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id = "barmoistGradient" x1 = "100%" y1 = "0%" x2 = "100%" y2 = "100%">
                      <stop offset="20%" stopColor="var(--amber-glow)" stopOpacity={1} />
                      <stop offset="100%" stopColor="var(--white)" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id = "barTempGradient" x1 = "100%" y1 = "0" x2 = "0%" y2 = "60%">
                      <stop offset="0%" stopColor="var(--yellow-green)" stopOpacity={1} />
                      <stop offset="100%" stopColor="var(--white)" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="moist_pct" name = "Moisture Percentage" fill="var(--chart-1)" radius={[22, 22, 0, 0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* pH Trend */}
          <div className="an-chart-card">
            <div className="an-chart-title">pH Trend</div>
            <div className="an-chart-inner">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphData}> 
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="min" name="Min" fill="var(--chart-1)" radius={[9, 9, 0, 0]}/>
                  <Bar dataKey="max" name="Max" fill="var(--chart-2)" radius={[9, 9, 0, 0]}/>
                  <Bar dataKey="avg" name="Avg" fill="var(--amber-glow)" radius={[9, 9, 0, 0]}/>  
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
