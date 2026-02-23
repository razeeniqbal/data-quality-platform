from datetime import datetime
from pathlib import Path
import pandas as pd
import numpy as np
import json
import time
import pyodbc
import uuid

# ==========================================================
# PRE-PROCESSING PHASE
# ==========================================================
def input_file_parq(
    csv_path: str,
    parq_fold_path: str,
    dim_map: dict
) -> pd.DataFrame:

    csv_path = Path(csv_path)

    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    required_cols = get_req_col(dim_map)
    df = pd.read_csv(csv_path, usecols=lambda c: c in required_cols)

    if df.empty:
        raise ValueError("Input CSV is empty.")

    df.insert(0, "SysId", [str(uuid.uuid4()) for _ in range(len(df))])
    #df = add_dim_col(df, dim_map)
    parq_fold_path = Path(parq_fold_path)
    parq_fold_path.mkdir(parents=True, exist_ok=True)
    parquet_name = csv_path.stem + ".parquet"
    parquet_path = parq_fold_path / parquet_name
    df.to_parquet(parquet_path, index=False)
    print(f"[INFO] Optimized parquet saved at: {parquet_path}")

    return df

def get_req_col(dim_map: dict) -> set:
    required_cols = set()

    for rule, config in dim_map.items():
        # Case 1: list of columns
        if isinstance(config, list):
            if config and isinstance(config[0], list):
                # list of list (composite)
                for cols in config:
                    required_cols.update(cols)
            else:
                required_cols.update(config)

        # Case 2: dict mapping column -> params
        elif isinstance(config, dict):
            for col, params in config.items():
                required_cols.add(col)

                # Handle compare_to case
                if isinstance(params, dict) and "compare_to" in params:
                    required_cols.add(params["compare_to"])

    return required_cols

# ==========================================================
# DATABASE CONNECTION (Next Module)
# ==========================================================
def get_database_connection(db_driver, db_server, db_database, db_username, db_password):
    max_retries = 3

    for attempt in range(max_retries):
        try:
            conn_str = (
                f"DRIVER={db_driver};"
                f"SERVER={db_server};"
                f"DATABASE={db_database};"
                f"UID={db_username};"
                f"PWD={db_password};"
                f"Connection Timeout=60;"
                f"Command Timeout=300;"
            )
            return pyodbc.connect(conn_str, timeout=60)

        except Exception as e:
            if attempt == max_retries - 1:
                print(f"[CRITICAL] Database connection failed: {str(e)}")
                return None

            print(f"[FAILED] Attempt {attempt + 1} failed, retrying...")
            time.sleep(2)

def safe_close_connection(conn):
    if conn:
        try:
            conn.close()
        except:
            pass

# ==========================================================
# REFERENCE RESOLVER
# ==========================================================
class ReferenceResolver:

    def __init__(self, db_config=None):
        self.cache = {}
        self.db_config = db_config

    def resolve(self, rule_type, params):

        cache_key = f"{rule_type}_{str(params)}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        if rule_type == "cons_list_str":
            values = set(params["values"])

        elif rule_type == "cons_uplo_csv":
            df_ref = pd.read_csv(params["csv_path"])
            values = set(df_ref[params["ref_col"]].dropna().astype(str))

        elif rule_type == "cons_conn_sql":
            values = self._load_from_sql(params)

        else:
            raise ValueError(f"Unknown consistency rule: {rule_type}")

        self.cache[cache_key] = values
        return values

    def _load_from_sql(self, params):

        if not self.db_config:
            print("[SKIP] No DB config provided")
            return set()

        conn = get_database_connection(**self.db_config)
        if not conn:
            return set()

        try:
            query = f"SELECT DISTINCT {params['ref_col']} FROM {params['table']}"
            df_ref = pd.read_sql(query, conn)
            return set(df_ref[params["ref_col"]].dropna().astype(str))

        finally:
            safe_close_connection(conn)

# ==========================================================
# RULES
# ==========================================================
VALIDITY_RULES = {
    'vali_val_pos': lambda s, _: s > 0,
    'vali_val_neg': lambda s, _: s < 0,
    'vali_val_rang': lambda s, p: s.between(p['min'], p['max']),
    'vali_high_val': lambda s, p: s > p['threshold'],
    'vali_low_val': lambda s, p: s < p['threshold'],
    'vali_high_col': lambda s, p, df: s > df[p['compare_to']],
    'vali_low_col': lambda s, p, df: s < df[p['compare_to']],
    'vali_list_str': lambda s, p: s.isin(p['values'])
}

CONSISTENCY_RULES = {
    'cons_list_str': lambda s, ref: s.astype(str).isin(ref),
    'cons_uplo_csv': lambda s, ref: s.astype(str).isin(ref),
    'cons_conn_sql': lambda s, ref: s.astype(str).isin(ref)
}

class DataQualityEngine:

    def __init__(self, df, dim_map, db_config=None):
        self.df = df.copy()
        self.dim_map = dim_map
        self.db_config = db_config
        self.total_rows = len(df)

        self.report = {
            "generated_at": str(datetime.now()),
            "total_rows": self.total_rows,
            "dimensions": {}
        }

        # Row-level flag container
        self.row_flags = pd.DataFrame(index=self.df.index)

    # ======================================================
    # RUN (Single Orchestrator)
    # ======================================================
    def run(self):
        self._check_completeness()
        self._check_uniqueness()
        self._check_validity()
        self._check_consistency()

        # Attach row flags to dataframe
        enriched_df = pd.concat([self.df, self.row_flags], axis=1)

        return enriched_df, self.report

    # ======================================================
    # COMPLETENESS
    # ======================================================
    def _check_completeness(self):
        columns = self.dim_map.get("completeness", [])

        if not columns:
            self.report["dimensions"]["completeness"] = {
                "columns": {},
                "dim_perc": 100.0
            }
            return

        results = {}
        col_scores = []

        for col in columns:
            null_mask = self.df[col].isna()
            null_count = int(null_mask.sum())

            # Row-level flag
            flag_col = f"completeness.{col}"
            self.row_flags[flag_col] = (~null_mask).astype("int8")

            non_nulls = self.total_rows - null_count
            col_perc = round((non_nulls / self.total_rows) * 100, 2)
            col_scores.append(col_perc)

            results[col] = {
                "null_count": null_count,
                "rows_evaluated": self.total_rows,
                "col_perc": col_perc
            }

        dim_perc = round(sum(col_scores) / len(col_scores), 2)
        self.report["dimensions"]["completeness"] = {
            "columns": results,
            "dim_perc": dim_perc
        }

    # ======================================================
    # UNIQUENESS
    # ======================================================
    def _check_uniqueness(self):
        sing_cols = self.dim_map.get("uniq_sing", [])
        mult_cols = self.dim_map.get("uniq_mult", [])

        results_sing = {}
        results_mult = {}
        total_scores = []

        # --- Single column uniqueness ---
        for col in sing_cols:
            if col not in self.df.columns:
                continue
            
            df_eval = self.df.dropna(subset=[col])
            rows_evaluated = len(df_eval)
            dup_mask = self.df.duplicated(subset=[col], keep=False)
            flag_col = f"uniq_sing.{col}"
            self.row_flags[flag_col] = (~dup_mask).astype("int8")

            if rows_evaluated == 0:
                col_perc = 100.0
                dup_count = 0
            else:
                dup_count = int(df_eval.duplicated(subset=[col]).sum())
                valid = rows_evaluated - dup_count
                col_perc = round((valid / rows_evaluated) * 100, 2)

            total_scores.append(col_perc)

            results_sing[col] = {
                "duplicate_count": dup_count,
                "rows_evaluated": rows_evaluated,
                "col_perc": col_perc
            }

        # --- Multi-column uniqueness ---
        for cols in mult_cols:
            if not all(c in self.df.columns for c in cols):
                continue
            
            key_name = ".".join(cols)            
            dup_mask = self.df.duplicated(subset=cols, keep=False)
            flag_col = f"uniq_mult.{key_name}"
            self.row_flags[flag_col] = (~dup_mask).astype("int8")

            df_eval = self.df.dropna(subset=cols)
            rows_evaluated = len(df_eval)

            if rows_evaluated == 0:
                col_perc = 100.0
                dup_count = 0
            else:
                dup_count = int(df_eval.duplicated(subset=cols).sum())
                valid = rows_evaluated - dup_count
                col_perc = round((valid / rows_evaluated) * 100, 2)

            total_scores.append(col_perc)

            results_mult[key_name] = {
                "columns_used": cols,
                "duplicate_count": dup_count,
                "rows_evaluated": rows_evaluated,
                "col_perc": col_perc
            }

        dim_perc = round(sum(total_scores) / len(total_scores), 2) if total_scores else 100.0

        self.report["dimensions"]["uniqueness"] = {
            "uniq_sing": results_sing,
            "uniq_mult": results_mult,
            "dim_perc": dim_perc
        }

    # ======================================================
    # VALIDITY
    # ======================================================
    def _check_validity(self):

        results = {}
        col_scores = []
    
        for rule_type, columns in self.dim_map.items():
    
            if not rule_type.startswith("vali_") or not columns:
                continue
    
            for col, params in (
                columns.items() if isinstance(columns, dict)
                else [(c, {}) for c in columns]
            ):
    
                if col not in self.df.columns:
                    continue
    
                # Evaluate only non-null rows
                non_null_mask = self.df[col].notna()
                rows_evaluated = int(non_null_mask.sum())
                flag_col = f"{rule_type}.{col}"
                full_mask = pd.Series(True, index=self.df.index)
    
                if rows_evaluated == 0:
                    col_perc = 100.0
                    invalid_count = 0
                    full_mask[:] = True
    
                else:
                    series = self.df.loc[non_null_mask, col]
    
                    # Column comparison rules need df
                    if rule_type in ["vali_high_col", "vali_low_col"]:
                        valid_mask = VALIDITY_RULES[rule_type](series, params, self.df.loc[non_null_mask])
                    else:
                        valid_mask = VALIDITY_RULES[rule_type](series, params)
    
                    valid_count = int(valid_mask.sum())
                    invalid_count = rows_evaluated - valid_count
                    col_perc = round((valid_count / rows_evaluated) * 100, 2)
    
                    # Merge into full dataframe mask
                    full_mask.loc[non_null_mask] = valid_mask
    
                # Store row-level flag
                self.row_flags[flag_col] = full_mask.astype("int8")
                col_scores.append(col_perc)
    
                results[col] = {
                    "rule": rule_type,
                    "invalid_count": invalid_count,
                    "rows_evaluated": rows_evaluated,
                    "col_perc": col_perc,
                    "rule_params": params
                }
    
        dim_perc = round(sum(col_scores) / len(col_scores), 2) if col_scores else 100.0
    
        self.report["dimensions"]["validity"] = {
            "columns": results,
            "dim_perc": dim_perc
        }

    # ======================================================
    # CONSISTENCY
    # ======================================================
    def _check_consistency(self):
        resolver = ReferenceResolver(self.db_config)
        results = {}
        col_scores = []
    
        for rule_type, columns in self.dim_map.items():
    
            if not rule_type.startswith("cons_") or not columns:
                continue
    
            for col, params in columns.items():
    
                if col not in self.df.columns:
                    continue
    
                non_null_mask = self.df[col].notna()
                rows_evaluated = int(non_null_mask.sum())
                flag_col = f"{rule_type}.{col}"
                full_mask = pd.Series(True, index=self.df.index)
    
                if rows_evaluated == 0:
                    col_perc = 100.0
                    invalid_count = 0
                    full_mask[:] = True
    
                else:
                    series = self.df.loc[non_null_mask, col]
                    ref_values = resolver.resolve(rule_type, params)
                    valid_mask = CONSISTENCY_RULES[rule_type](series, ref_values)
                    valid_count = int(valid_mask.sum())
                    invalid_count = rows_evaluated - valid_count
                    col_perc = round((valid_count / rows_evaluated) * 100, 2)
                    full_mask.loc[non_null_mask] = valid_mask
    
                # Store row-level flag
                self.row_flags[flag_col] = full_mask.astype("int8")
                col_scores.append(col_perc)
    
                results[col] = {
                    "rule": rule_type,
                    "invalid_count": invalid_count,
                    "rows_evaluated": rows_evaluated,
                    "col_perc": col_perc,
                    "rule_params": params
                }
    
        dim_perc = round(sum(col_scores) / len(col_scores), 2) if col_scores else 100.0
        self.report["dimensions"]["consistency"] = {
            "columns": results,
            "dim_perc": dim_perc
        }
        
    # ======================================================
    # SAVE JSON SAFE
    # ======================================================
    def save(self, path):

        def convert_types(obj):
            if isinstance(obj, (np.integer,)):
                return int(obj)
            if isinstance(obj, (np.floating,)):
                return float(obj)
            if isinstance(obj, (np.ndarray,)):
                return obj.tolist()
            return obj

        with open(path, "w") as f:
            json.dump(self.report, f, indent=4, default=convert_types)


