import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { sb as supabase } from '../../../utils/SBClient';

interface SensRow {
  id: string;
  bkt_10m: string | null;
  dev_id: string | null;
  crop: string | null;
  crop_text?: string | null;
  device_name?: string | null;
  src_created_at: string | null;
  ph: number | null;
  moist_pct: number | null;
  temp_c: number | null;
  ec_ms: number | null;
  n_mgkg: number | null;
  p_mgkg: number | null;
  k_mgkg: number | null;
}

function formatNumber(val: number | null | undefined) {
  if (val === null || val === undefined) return "-";
  return Number(val).toFixed(2);
}

const ALLOWED_SORT_COLUMNS = [
  "bkt_10m",
  "crop_text",
  "device_name",
  "ph",
  "moist_pct",
  "temp_c",
  "ec_ms",
  "n_mgkg",
  "p_mgkg",
  "k_mgkg",
];

export default function DatabaseTable(): React.JSX.Element {
  const [rows, setRows] = useState<SensRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [total, setTotal] = useState<number | null>(null);

  const [search, setSearch] = useState<string>("");
  const [timeFilter, setTimeFilter] = useState<"24h" | "7d" | "30d">("24h");

  // row limit filter
  const [rowLimit, setRowLimit] = useState<number | "all">("all");

  const [sortBy, setSortBy] = useState<{ col: string; asc: boolean }>({
    col: "bkt_10m",
    asc: false,
  });

  const selectColumns = useMemo(
    () =>
      `id, bkt_10m, dev_id, crop, crop_text, device_name, src_created_at,
       ph, moist_pct, temp_c, ec_ms, n_mgkg, p_mgkg, k_mgkg`,
    []
  );

  function getTimeThreshold(filter: "24h" | "7d" | "30d") {
    const now = new Date();
    if (filter === "24h") now.setHours(now.getHours() - 24);
    if (filter === "7d") now.setDate(now.getDate() - 7);
    if (filter === "30d") now.setDate(now.getDate() - 30);
    return now.toISOString();
  }

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      setLoading(true);
      try {
        const sortCol = ALLOWED_SORT_COLUMNS.includes(sortBy.col)
          ? sortBy.col
          : "bkt_10m";

        let query = supabase
          .from("sens_rdg_with_device")
          .select(selectColumns, { count: "exact" })
          .gte("bkt_10m", getTimeThreshold(timeFilter))
          .order(sortCol, { ascending: sortBy.asc });

        if (search.trim().length > 0) {
          query = query.ilike("crop_text", `%${search.trim()}%`);
        }

        if (rowLimit !== "all") {
          query = query.limit(rowLimit);
        }

        // execute query
        const res = await query;
        // res has .data, .count, .error — narrow them explicitly:
        const data = res.data as SensRow[] | null;
        const count = (res as any).count as number | null;
        const error = (res as any).error;

        if (error) throw error;

        if (!cancelled) {
          setRows(data ?? []);
          setTotal(count ?? null);
        }
      } catch (err) {
        console.error("Error loading sens_rdg_with_device:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRows();
    return () => {
      cancelled = true;
    };
  }, [search, sortBy, timeFilter, rowLimit]);

  // FULL FILTERED EXPORT
  async function downloadAllExcel() {
    try {
      let query = supabase
        .from("sens_rdg_with_device")
        .select(selectColumns)
        .gte("bkt_10m", getTimeThreshold(timeFilter));

      if (search.trim().length > 0) {
        query = query.ilike("crop_text", `%${search.trim()}%`);
      }

      if (rowLimit !== "all") {
        query = query.limit(rowLimit);
      }

      const sortCol = ALLOWED_SORT_COLUMNS.includes(sortBy.col)
        ? sortBy.col
        : "bkt_10m";

      const res = await query.order(sortCol, {
        ascending: sortBy.asc,
      });

      const data = res.data as SensRow[] | null;
      const error = (res as any).error;
      if (error) throw error;

      const normalized = (data ?? []).map((r) => ({
        id: r.id,
        time: r.bkt_10m ?? r.src_created_at ?? "",
        device: r.device_name ?? r.dev_id ?? "",
        crop: r.crop_text ?? r.crop ?? "",
        ph: r.ph ?? "",
        moist_pct: r.moist_pct ?? "",
        temp_c: r.temp_c ?? "",
        ec_ms: r.ec_ms ?? "",
        n_mgkg: r.n_mgkg ?? "",
        p_mgkg: r.p_mgkg ?? "",
        k_mgkg: r.k_mgkg ?? "",
      }));

      const ws = XLSX.utils.json_to_sheet(normalized);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "filtered");

      XLSX.writeFile(
        wb,
        `SENSOR_HIST_LOG-${timeFilter}_${search || "all"}.xlsx`
      );
    } catch (err) {
      console.error("Full export error:", err);
    }
  }

  function toggleSort(col: string) {
    const safeCol = ALLOWED_SORT_COLUMNS.includes(col) ? col : "bkt_10m";
    if (sortBy.col === safeCol) {
      setSortBy({ col: safeCol, asc: !sortBy.asc });
    } else {
      setSortBy({ col: safeCol, asc: true });
    }
  }

  return (
    <div className="db-container">
      <h2 className="sens-title">History Log</h2>

      <div className="controls">
        <input
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search crop..."
        />

        <select
          className="select"
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as any)}
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>

        <select
          className="select"
          value={rowLimit}
          onChange={(e) =>
            setRowLimit(e.target.value === "all" ? "all" : Number(e.target.value))
          }
        >
          <option value="all">All rows</option>
          <option value="10">First 10</option>
          <option value="20">First 20</option>
          <option value="50">First 50</option>
          <option value="100">First 100</option>
        </select>

        <button className="btn" onClick={downloadAllExcel}>
          Export ↗
        </button>

        <button
          className="btn-secondary"
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>

        <div className="info">{loading ? "Loading..." : `${rows.length} rows`}</div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="th">#</th>
              <th className="th sortable" onClick={() => toggleSort("bkt_10m")}>
                Time {sortBy.col === "bkt_10m" ? (sortBy.asc ? "▲" : "▼") : ""}
              </th>
              <th className="th">Device</th>
              <th className="th sortable" onClick={() => toggleSort("crop_text")}>
                Crop {sortBy.col === "crop_text" ? (sortBy.asc ? "▲" : "▼") : ""}
              </th>
              <th className="th">pH</th>
              <th className="th">Moist %</th>
              <th className="th">Temp (°C)</th>
              <th className="th">EC (mS/cm)</th>
              <th className="th">N (mg/kg)</th>
              <th className="th">P (mg/kg)</th>
              <th className="th">K (mg/kg)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                <td className="td">{idx + 1}</td>
                <td className="td">
                  {r.bkt_10m ? new Date(r.bkt_10m).toLocaleString() : "-"}
                </td>
                <td className="td">{r.device_name ?? r.dev_id ?? "-"}</td>
                <td className="td">{r.crop_text ?? r.crop ?? "-"}</td>
                <td className="td">{formatNumber(r.ph)}</td>
                <td className="td">{formatNumber(r.moist_pct)}</td>
                <td className="td">{formatNumber(r.temp_c)}</td>
                <td className="td">{formatNumber(r.ec_ms)}</td>
                <td className="td">{formatNumber(r.n_mgkg)}</td>
                <td className="td">{formatNumber(r.p_mgkg)}</td>
                <td className="td">{formatNumber(r.k_mgkg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="footer-info">
        {total !== null ? `${total} total rows (before limit)` : ""}
      </div>
    </div>
  );
}
