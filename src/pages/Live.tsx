import { useEffect, useState } from 'react';
import { sb } from '../SBClient';
import type { Crop, Dev, TelemRow } from '../type';
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// Param cfg for bar cards
const PARAMS: {
  key: keyof TelemRow;
  label: string;
  unit?: string;
  icon: string;
  short: string;
}[] = [
  { key: 'moist_pct', label: 'Moisture',    unit: '%',      icon: '💧', short: 'MOISTURE' },
  { key: 'temp_c',    label: 'Temperature', unit: '°C',     icon: '🌡️', short: 'TEMPERATURE' },
  { key: 'ec_ms',     label: 'EC',          unit: 'mS/cm',  icon: '⚡',  short: 'EC' },
  { key: 'ph',        label: 'pH',                         icon: '🧪', short: 'PH' },
  { key: 'n_mgkg',    label: 'Nitrogen',    unit: 'mg/kg',  icon: 'N',   short: 'NITROGEN' },
  { key: 'p_mgkg',    label: 'Phosphorus',  unit: 'mg/kg',  icon: 'P',   short: 'PHOSPHORUS' },
  { key: 'k_mgkg',    label: 'Potassium',   unit: 'mg/kg',  icon: 'K',   short: 'POTASSIUM' },
];

// crop_thr row type
type ThrRow = {
  crop: Crop;
  param: string;
  val_min: number;
  val_max: number;
  unit: string;
  descr: string | null;
};

export default function Live() {
  const [dev, setDev] = useState<Dev | null>(null);
  const [crop, setCrop] = useState<Crop>('pechay');
  const [telem, setTelem] = useState<TelemRow | null>(null);
  const [loading, setLoading] = useState(true);

  const [thrMap, setThrMap] = useState<Record<string, ThrRow>>({});
  const [altCropRecommendations, setAltCropRecommendations] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: devData, error } = await sb
        .from('device')
        .select('id, name, ing_tok, cur_crop')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading device:', error);
        setLoading(false);
        return;
      }

      if (devData) {
        const d = devData as Dev;
        setDev(d);
        if (d.cur_crop) {
          setCrop(d.cur_crop);
        }
      }

      setLoading(false);
    })();
  }, []);

  async function handleCropChange(newCrop: Crop) {
    setCrop(newCrop);
    if (!dev) return;

    const { error } = await sb
      .from('device')
      .update({ cur_crop: newCrop })
      .eq('id', dev.id);

    if (error) {
      console.error('Error updating cur_crop:', error);
    }
  }

  // latest rt telem row for selected crop from telem_rt
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await sb
        .from('telem_rt')
        .select('*')
        .eq('crop', crop)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading rt telem:', error);
        return;
      }

      if (!cancelled) {
        setTelem(data as TelemRow | null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [crop]);

  // Subscribe to realtime changes in telem_rt
  useEffect(() => {
    const channel = sb
      .channel('telem_rt_stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'telem_rt' },
        payload => {
          const row = payload.new as TelemRow;
          if (row.crop === crop) {
            setTelem(row);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'telem_rt' },
        payload => {
          const row = payload.new as TelemRow;
          if (row.crop === crop) {
            setTelem(row);
          }
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [crop]);

  // Load thr cfg for selected crop from crop_thr
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await sb
        .from('crop_thr')
        .select('crop, param, val_min, val_max, unit, descr')
        .eq('crop', crop);

      if (error) {
        console.error('Error loading crop_thr:', error);
        return;
      }

      if (!cancelled && data) {
        const map: Record<string, ThrRow> = {};
        (data as any[]).forEach((row) => {
          map[row.param] = {
            crop: row.crop,
            param: row.param,
            val_min: Number(row.val_min),
            val_max: Number(row.val_max),
            unit: row.unit,
            descr: row.descr,
          };
        });
        setThrMap(map);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [crop]);

  useEffect(() => {
    async function fetchAltCropData() {
      try {
        const { data, error } = await sb
          .from('alt_crop_reco')
          .select('*');

        if (error) {
          console.error('Error fetching alternative crop data:', error);
        } else {
          setAltCropRecommendations(data);
        }
      } catch (err) {
        console.error('Error fetching alternative crop data:', err);
      }
    }

    fetchAltCropData();
  }, []);

  useEffect(() => {
    async function fetchChartData() {
      const { data, error } = await sb
        .from('sens_rdg_30m')
        .select('bkt_30m, crop, ph, moist_pct, temp_c, ec_ms, n_mgkg, p_mgkg, k_mgkg')
        .eq('crop', crop)
        .order('bkt_30m', { ascending: true })
        .limit(24);

      if (error) {
        console.error('Error fetching chart data:', error);
      } else {
        setChartData(
          (data as any[]).map((r) => ({
            t: new Date(r.bkt_30m).toLocaleString(),
            ph: r.ph,
            moist_pct: r.moist_pct,
            temp_c: r.temp_c,
            ec_ms: r.ec_ms,
            n_mgkg: r.n_mgkg,
            p_mgkg: r.p_mgkg,
            k_mgkg: r.k_mgkg,
          }))
        );
      }
    }

    fetchChartData();
  }, [crop]);

  const lastUpdated = telem
    ? new Date(telem.upd_at).toLocaleString()
    : 'No data yet';

  // Build text summary for crop-specific treatment
  function buildCropReco(): string {
    if (!telem) {
      return 'Waiting for real-time sensor data. Once readings are available, this area will highlight which parameters are below or above the optimal range for the selected crop.';
    }

    const issues: string[] = [];

    PARAMS.forEach((p) => {
      const rawVal = telem[p.key] as any;
      const numVal =
        rawVal !== null && rawVal !== undefined ? Number(rawVal) : null;

      if (numVal === null || Number.isNaN(numVal)) return;

      const thr = thrMap[p.key as string];
      if (!thr) return;

      const min = thr.val_min;
      const max = thr.val_max;
      const unit = thr.unit || p.unit || '';
      const baseDesc = thr.descr ?? '';

      // Check if the parameter is out of range
      if (numVal < min) {
        issues.push(
          `• ${p.label} is LOW (${numVal}${unit ? ' ' + unit : ''}; optimal ${min}–${max} ${unit}). ${baseDesc}`
        );
      } else if (numVal > max) {
        issues.push(
          `• ${p.label} is HIGH (${numVal}${unit ? ' ' + unit : ''}; optimal ${min}–${max} ${unit}). ${baseDesc}`
        );
      }

      return issues.join('\n');
    });

    // If there are no issues, the crop is doing well
    if (!issues.length) {
      return `• The selected crop is doing well. Maintain your current practices.`;
    }

    return issues.join('\n');
  }

  // Build alternative crop recommendation (bullet points)
function buildAltReco(): string {
  if (!telem) {
    return 'Alternative crop suggestions will appear here once stable soil readings are available. For now, focus on reaching the optimal ranges for the selected crop.';
  }

  console.log('=== ALT CROP RECOMMENDATION DEBUG ===');
  console.log('Current crop:', crop);
  console.log('Telem data:', telem);
  console.log('Alt crop recommendations from DB:', altCropRecommendations);

  let recommendedCrop: string | null = null

  PARAMS.forEach((p) => {
    if (recommendedCrop) return;

    const rawVal = telem[p.key] as any;
    const numVal = rawVal !== null && rawVal !== undefined ? Number(rawVal) : null;

    if (numVal === null || Number.isNaN(numVal)) return;

    const thr = thrMap[p.key as string];
    if (!thr) return;

    if (p.key === 'moist_pct') {
      if (p.key === 'moist_pct' && numVal < 40) {
        const altCrop = altCropRecommendations.find(
          (rec) => rec.soil_param === 'Soil Moisture' && rec.reading_range === '<40% (dry)'
        );
        if (altCrop) {
          recommendedCrop = altCrop.recommended_crop;
        }
      }
    }

    // Alternative crop logic for EC (ec_ms)
    if (p.key === 'ec_ms') {
      if (numVal > 2.0) { // If EC is above 2.0 mS/cm (high)
        const altCrop = altCropRecommendations.find(
          (rec) => rec.soil_param === 'EC' && rec.reading_range === 'High EC (>2.0 mS/cm)'
        );
        if (altCrop) {
          recommendedCrop = altCrop.recommended_crop;
        }
      }
    }

    // Alternative crop logic for temperature (temp_c)
    if (p.key === 'temp_c') {
      if (numVal > 30) { // If temperature is too high (>30°C)
        const altCrop = altCropRecommendations.find(
          (rec) => rec.soil_param === 'Soil Temperature' && rec.reading_range === '>30° C (hot soil)'
        );
        if (altCrop) {
          recommendedCrop = altCrop.recommended_crop;
        }
      }
    }
  });


  if (recommendedCrop) {
    const cropString = String(recommendedCrop);

    if (cropString.includes(' or ')) {
      const crops = cropString.split(' or ').map(c => c.trim());
      const currentCropName = String(crop).toLowerCase();
      const differentCrop = crops.find(c => c.toLowerCase() !== currentCropName);
      recommendedCrop = differentCrop || crops[0];
    }
  }

  const currentCropName = String(crop).toLowerCase();
  const recoCropName = recommendedCrop ? String(recommendedCrop).toLowerCase() : '';

  if (!recommendedCrop || recoCropName === currentCropName) {
    return `• The selected crop is doing well. If issues arise, consider alternative crops based on soil conditions.`;
  }
  return `• Based on your current soil conditions, consider switching to: ${recommendedCrop}.`;
}






  return (
    <>
      <div className="row">
        <span className="status-chip">
          <span className="status-dot" />
          Live data
        </span>

        <div>
          <label style={{ fontSize: 13, marginRight: 6 }}>Crop under test:</label>
          <select
            className="select"
            value={crop}
            onChange={e => handleCropChange(e.target.value as Crop)}
            disabled={loading}
          >
            <option value="pechay">Pechay</option>
            <option value="lemongrass">Lemongrass</option>
            <option value="okra">Okra</option>
          </select>
        </div>

        {!telem && (
          <div style={{ fontSize: 13, color: '#9ca3af' }}>
            Waiting for real-time data… Make sure your ESP32 is sending readings to the <code>ingest</code> function and that{' '}
            <code>cur_crop</code> matches this selected crop.
          </div>
        )}
      </div>

      <div className="bars-wrapper">
        {PARAMS.map(p => {
          const rawVal = telem?.[p.key] as any;
          const numVal = rawVal !== null && rawVal !== undefined ? Number(rawVal) : null;

          let pct = 0;
          if (typeof numVal === 'number' && !isNaN(numVal)) {
            pct = Math.max(0, Math.min(100, numVal));
          }

          return (
            <div className="bar-card" key={String(p.key)}>

              <div className="bar-shell" role='progressBar' aria-label={`${p.short} level`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                <div className="bar-fill" style={{ ['--pct' as any]: `${pct}%` }} />
              </div>
              
              <div className="bar-left">
                <div className="bar-value">
                  {numVal !== null && !isNaN(numVal) ? numVal : '—'}
                  {numVal !== null && !isNaN(numVal) && p.unit && (
                  <span className="bar-unit">{p.unit}</span>
                  )}
                </div>
                <div className="bar-footer">
                  <div className="bar-icon" aria-hidden>{p.icon}</div>
                  <div className="bar-label">{p.short}</div>
                </div>
              </div>

              <div className="bar-time" style={{ fontSize: '0.625rem', opacity: 0.7 }}>
                {lastUpdated}
              </div>
            </div>
          );
        })}
      </div>


      <div className="reco-grid">
        <div className="inner-reco-grid">
          <div className="reco-card">
            <div className="reco-title">Crop-Specific Treatment</div>
              <div className="reco-body">{buildCropReco()}</div>
          </div>
          <div className="reco-card">
            <div className="reco-title">Alternative Crop</div>
              <div className="reco-body">{buildAltReco()}</div>
          </div>
        </div>

        <div className="an-chart-card-overview">
          <div className="an-chart-title-overview">Analytics Overview</div>
          <div className="an-chart-inner-overview">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id = "moistGradient" x1 = "40%" y1 = "10%" x2 = "60%" y2 = "100%">
                    <stop offset="0%" stopColor="var(--amber-glow)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--white)" stopOpacity={1} />
                  </linearGradient>

                  <linearGradient id = "tempGradient" x1 = "40%" y1 = "10%" x2 = "60%" y2 = "100%">
                    <stop offset="20%" stopColor="var(--chart-1)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--white)" stopOpacity={1} />
                  </linearGradient>

                  <linearGradient id = "ecGradient" x1 = "0%" y1 = "0%" x2 = "100%" y2 = "100%">
                    <stop offset="0%" stopColor="var(--white)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--yellow-green)" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="temp_c" name="Temp (°C)" dot={false} stroke = "var(--chart-1)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="moist_pct" name="Moisture (%)" dot={false} stroke = "var(--amber-glow)" fill = "url(#moistGradient)"/>
                <Line type="monotone" dataKey="ec_ms" name="EC (mS/cm)" dot={false} stroke = "var(--chart-2)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
