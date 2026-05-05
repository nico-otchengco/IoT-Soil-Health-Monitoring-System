export type Crop = 'pechay' | 'tanglad' | 'okra';

// Row from devices table
export type Dev = {
  id: string;
  name: string;
  ing_tok: string;
  cur_crop: Crop | null;
};

// Row from telem_last table
export type TelemRow = {
  dev_id: string;
  upd_at: string;
  crop: Crop;

  ph: number | null;
  moist_pct: number | null;
  temp_c: number | null;
  ec_ms: number | null;
  n_mgkg: number | null;
  p_mgkg: number | null;
  k_mgkg: number | null;
};