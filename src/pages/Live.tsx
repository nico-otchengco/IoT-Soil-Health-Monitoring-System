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
  { key: 'ph',        label: 'pH',                          icon: '🧪', short: 'PH' },
  { key: 'n_mgkg',    label: 'Nitrogen',    unit: 'mg/kg',  icon: 'N',   short: 'NITROGEN' },
  { key: 'p_mgkg',    label: 'Phosphorus',  unit: 'mg/kg',  icon: 'P',   short: 'PHOSPHORUS' },
  { key: 'k_mgkg',    label: 'Potassium',   unit: 'mg/kg',  icon: 'K',   short: 'POTASSIUM' },
];

const TREATMENT_PRIORITY: (keyof TelemRow)[] = [
  'ec_ms', 'ph', 'moist_pct', 'temp_c', 'n_mgkg', 'p_mgkg', 'k_mgkg'
];

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
  const [cropRecoMap, setCropRecoMap] = useState<Record<string, any>>({});

  const [predictions, setPredictions] = useState<any[]>([]);
  const [predLoading, setPredLoading] = useState(true);

  // ✅ FIXED: reads dev_id from user_device table instead of user metadata
  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: userDevice, error: udError } = await sb
        .from('user_device')
        .select('dev_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (udError || !userDevice) {
        console.error('No device linked to this user:', udError);
        setLoading(false);
        return;
      }

      const { data: devData, error } = await sb
        .from('device')
        .select('id, name, ing_tok, cur_crop')
        .eq('id', userDevice.dev_id)
        .maybeSingle();

      if (error || !devData) {
        console.error('Error loading device:', error);
        setLoading(false);
        return;
      }

      const d = devData as Dev;
      setDev(d);
      if (d.cur_crop) setCrop(d.cur_crop);

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

  useEffect(() => {
    if (!dev?.id) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await sb
        .from('telem_rt')
        .select('*')
        .eq('dev_id', dev?.id)
        .eq('crop', crop)
        .maybeSingle();

      if (error) {
        console.error('Error loading rt telem:', error);
        return;
      } 

      if (!cancelled) {
        setTelem(data as TelemRow | null);
      }
    })();

    return () => { cancelled = true; };
  }, [dev?.id, crop]);

  useEffect(() => {
    if (!dev) return;

    const channel = sb
      .channel('telem_rt_stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telem_rt' },
        payload => {
          const row = payload.new as TelemRow;
          if (row.crop === crop) setTelem(row);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'telem_rt' },
        payload => {
          const row = payload.new as TelemRow;
          if (row.crop === crop) setTelem(row);
        })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [crop]);

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

    return () => { cancelled = true; };
  }, [crop]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await sb
        .from('crop_reco')
        .select('param, condition, symptoms, indicator, recommended_treatment, fertilizer_amendments, notes')
        .eq('crop', crop);

      if (error) {
        console.error('Error loading crop_reco:', error);
        return;
      }

      if (!cancelled && data) {
        const map: Record<string, any> = {};
        (data as any[]).forEach((row) => {
          const condLower = row.condition.toLowerCase();
          let condKey: string;
          if (condLower.startsWith('low')) condKey = `${row.param}_low`;
          else if (condLower.startsWith('high')) condKey = `${row.param}_high`;
          else condKey = `${row.param}_${condLower}`;
          map[condKey] = row;
        });
        setCropRecoMap(map);
      }
    })();

    return () => { cancelled = true; };
  }, [crop]);

  useEffect(() => {
    async function fetchAltCropData() {
      try {
        const { data, error } = await sb.from('alt_crop_reco').select('*');
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
    if (!dev) return;
    let cancelled = false;
    (async () => {
      setPredLoading(true);
      const { data, error } = await sb
        .from('predictions')
        .select('*')
        .eq('dev_id', dev.id)
        .eq('crop', crop)
        .order('evaluated_at', { ascending: false });
      
      if (!cancelled) {
        if (!error && data) setPredictions(data);
        setPredLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [dev, crop]);

  useEffect(() => {
    if (!dev) return;
    
    async function fetchChartData() {
      const { data, error } = await sb
        .from('sens_rdg_10m')
        .select('bkt_10m, crop, ph, moist_pct, temp_c, ec_ms, n_mgkg, p_mgkg, k_mgkg')
        .eq('crop', crop)
        .order('bkt_10m', { ascending: true })
        .limit(24);

      if (error) {
        console.error('Error fetching chart data:', error);
      } else {
        setChartData(
          (data as any[]).map((r) => ({
            t: new Date(r.bkt_10m).toLocaleString(),
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

  function buildCropReco(): string {
    if (!telem) {
      return 'Waiting for real-time sensor data. Once readings are available, this area will highlight which parameters are below or above the optimal range for the selected crop.';
    }

    const issues: string[] = [];
    const treatments: string[] = [];
    const fertilizers: string[] = [];

    PARAMS.forEach((p) => {
      const rawVal = telem[p.key] as any;
      const numVal = rawVal !== null && rawVal !== undefined ? Number(rawVal) : null;

      if (numVal === null || Number.isNaN(numVal)) return;

      const thr = thrMap[p.key as string];
      if (!thr) return;

      const min = thr.val_min;
      const max = thr.val_max;
      const unit = thr.unit || p.unit || '';

      let conditionKey: string | null = null;
      if (numVal < min) conditionKey = `${p.key}_low`;
      else if (numVal > max) conditionKey = `${p.key}_high`;

      if (!conditionKey) return;

      const reco = cropRecoMap[conditionKey];
      const status = numVal < min ? 'LOW' : 'HIGH';

      let entry = `• ${p.label} is ${status} (${numVal}${unit ? ' ' + unit : ''}; optimal ${min}–${max} ${unit}).`;
      if (reco?.symptoms) entry += ` Symptoms: ${reco.symptoms}.`;
      if (reco?.notes) entry += ` Notes: ${reco.notes}.`;

      issues.push(entry);
    });

    TREATMENT_PRIORITY.forEach((paramKey) => {
      const p = PARAMS.find(p => p.key === paramKey);
      if (!p) return;

      const rawVal = telem[p.key] as any;
      const numVal = rawVal !== null && rawVal !== undefined ? Number(rawVal) : null;

      if (numVal === null || Number.isNaN(numVal)) return;

      const thr = thrMap[p.key as string];
      if (!thr) return;

      let conditionKey: string | null = null;
      if (numVal < thr.val_min) conditionKey = `${p.key}_low`;
      else if (numVal > thr.val_max) conditionKey = `${p.key}_high`;

      if (!conditionKey) return;

      const reco = cropRecoMap[conditionKey];
      if (reco?.recommended_treatment) treatments.push(reco.recommended_treatment);
      if (reco?.fertilizer_amendments) fertilizers.push(reco.fertilizer_amendments);
    });

    if (!issues.length) {
      return `• The selected crop is doing well. Maintain your current practices.`;
    }

    let result = issues.join('\n\n');

    if (treatments[0]) {
      result += `\n\nRecommended Treatment:\n  ${treatments[0]}`;
    }
    if (fertilizers[0]) {
      result += `\n\nRecommended Fertilizer:\n  ${fertilizers[0]}`;
    }

    return result;
  }

  function buildAltReco(avg?: {ph: number; ec_ms: number; n_mgkg: number; p_mgkg: number; k_mgkg: number; moist_pct: number; temp_c: number;}): string {
    const source = avg ?? telem;
      
    if (!source) {
      return 'Alternative crop suggestions will appear here once stable soil readings are available.';
    }

    let worstParamKey: keyof TelemRow | null = null;

    for (const paramKey of TREATMENT_PRIORITY) {
      const rawVal = (source as any)[paramKey];
      const numVal = rawVal !== null && rawVal !== undefined ? Number(rawVal) : null;
      if (numVal === null || Number.isNaN(numVal)) continue;

      const thr = thrMap[paramKey as string];
      if (!thr) continue;

      if (numVal < thr.val_min || numVal > thr.val_max) {
        worstParamKey = paramKey;
        break;
      }
    }

    if (!worstParamKey) {
      return `• The selected crop is doing well. If issues arise, consider alternative crops based on soil conditions.`;
    }

    const paramLabel = PARAMS.find(p => p.key === worstParamKey)?.label ?? String(worstParamKey);
    const thr = thrMap[worstParamKey as string];
    const rawVal = (source as any)[worstParamKey];
    const numVal = Number(rawVal);

    const isLow = numVal < thr.val_min;

    const soilParamAlias: Partial<Record<keyof TelemRow, string>> = {
      ph:       'Soil pH',
      temp_c:   'Soil Temperature',
      moist_pct:'Soil Moisture',
      ec_ms:    'EC',
      n_mgkg:   'Nitrogen',
      p_mgkg:   'Phosphorus',
      k_mgkg:   'Potassium',
    };

    const soilParamLabel = soilParamAlias[worstParamKey] ?? paramLabel;

    console.log('worstParamKey:', worstParamKey);
    console.log('soilParamLabel:', soilParamLabel);
    console.log('isLow:', isLow);
    console.log('altCropRecommendations:', altCropRecommendations);
    console.log('Trying to match soil_param:', soilParamLabel);
    altCropRecommendations.forEach(rec => {
      console.log('  DB row:', rec.soil_param, '|', rec.reading_range, '| match?', rec.soil_param?.toLowerCase() === soilParamLabel.toLowerCase());
    });

    const altMatches = altCropRecommendations.filter((rec) => {
      const paramMatch = rec.soil_param?.toLowerCase() === soilParamLabel.toLowerCase();
      const rangeStr = rec.reading_range?.toLowerCase() ?? '';
      if (isLow) return paramMatch && (rangeStr.includes('low') || rangeStr.includes('<') || rangeStr.includes('acidic') || rangeStr.includes('defici'));
      else return paramMatch && (rangeStr.includes('high') || rangeStr.includes('>') || rangeStr.includes('alkaline') || rangeStr.includes('excess'));
    });

    const altMatch = altMatches.find((rec) => {
      const recCrop = String(rec.recommended_crop).toLowerCase();
      if (recCrop.includes(' or ')) {
        const options = recCrop.split(' or ').map((c: string) => c.trim());
        return options.some((c: string) => c !== String(crop).toLowerCase());
      }
      return recCrop !== String(crop).toLowerCase();
    });

    let recommendedCrop: string | null = altMatch?.recommended_crop ?? null;

    if (recommendedCrop) {
      const cropString = String(recommendedCrop);
      if (cropString.includes(' or ')) {
        const crops = cropString.split(' or ').map(c => c.trim());
        const differentCrop = crops.find(c => c.toLowerCase() !== String(crop).toLowerCase());
        recommendedCrop = differentCrop || crops[0];
      }
    }

    if (!recommendedCrop) {
      return `• Soil conditions are suboptimal (${paramLabel} is ${isLow ? 'LOW' : 'HIGH'}) but no specific alternative crop found in database. Consider consulting your agronomist.`;
    }

    return `• Based on your soil conditions (${paramLabel} is ${isLow ? 'LOW' : 'HIGH'}), consider switching to: ${recommendedCrop}.\n\n  Justification: ${altMatch?.justification ?? 'Better suited to current soil conditions.'}`;
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
          
          {predLoading ? (
            <div className="reco-card">
              <div className="reco-body" style={{ color: '#9ca3af' }}>
                Loading predictions...
              </div>
            </div>
          ) : predictions.length === 0 ? (
            <div className="reco-card">
              <div className="reco-title">7-Day Prediction</div>
              <div className="reco-body" style={{ color: '#6b7280' }}>
                No stress conditions detected in the last 7 days.
              </div>
            </div>
          ) : (
            predictions.map((pred) => (
              <div className="reco-card" key={pred.rule_id}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: 20,
                    background:
                      pred.severity === 'Critical' ? '#fee2e2' :
                      pred.severity === 'High'     ? '#ffedd5' :
                      pred.severity === 'Moderate' ? '#fef9c3' : '#dcfce7',
                    color:
                      pred.severity === 'Critical' ? '#991b1b' :
                      pred.severity === 'High'     ? '#9a3412' :
                      pred.severity === 'Moderate' ? '#854d0e' : '#166534',
                  }}>
                    {pred.severity}
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    Act within: {pred.act_within}
                  </span>
                </div>
                <div className="reco-title">{pred.label}</div>
                <div className="reco-body" style={{ marginBottom: 8 }}>
                  {pred.interpretation}
                </div>
                <div className="reco-body" style={{ marginBottom: 12 }}>
                  <strong>Action: </strong>{pred.action}
                </div>
                <div style={{
                  borderTop: '1px solid #e5e7eb',
                  marginBottom: 12,
                }} />
                <div className="reco-title">Alternative Crop</div>
                <div className="reco-body">
                  {buildAltReco({
                    ph:        pred.avg_ph,
                    ec_ms:     pred.avg_ec_ms,
                    n_mgkg:    pred.avg_n_mgkg,
                    p_mgkg:    pred.avg_p_mgkg,
                    k_mgkg:    pred.avg_k_mgkg,
                    moist_pct: pred.avg_moist_pct,
                    temp_c:    pred.avg_temp_c,
                  })}
                </div> 
              </div>
            ))
          )}
        </div>

        <div className="an-chart-card-overview">
          <div className="an-chart-title-overview">Analytics Overview</div>
          <div className="an-chart-inner-overview">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="moistGradient" x1="40%" y1="10%" x2="60%" y2="100%">
                    <stop offset="0%" stopColor="var(--amber-glow)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--white)" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="tempGradient" x1="40%" y1="10%" x2="60%" y2="100%">
                    <stop offset="20%" stopColor="var(--chart-1)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--white)" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="ecGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--white)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--yellow-green)" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="temp_c" name="Temp (°C)" dot={false} stroke="var(--chart-1)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="moist_pct" name="Moisture (%)" dot={false} stroke="var(--amber-glow)" fill="url(#moistGradient)" />
                <Line type="monotone" dataKey="ec_ms" name="EC (mS/cm)" dot={false} stroke="var(--chart-2)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}