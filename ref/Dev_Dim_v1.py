import pandas as pd
from pathlib import Path
from Qplus_v3 import DataQualityEngine
from Qplus_v3 import input_file_parq
from Qplus_v3 import get_req_col

csv_path = r"C:\Users\AEM-Azrien\Downloads\Qplus\Dev code\proceng.FieldActualProductionMA_MY_B01_NULL_3_20251217T024955.csv"
parq_fold_path = r"C:\Users\AEM-Azrien\Downloads\Qplus\engine\Input Dataset"

dim_map = {
    # Completeness Dimension
    'completeness': ['Region','FieldCode','Field','Location','ResourceSecurityClassification'],
    
    # Uniqueness Dimension
    'uniq_sing': ['ProdNo', 'FieldCode'],
    'uniq_mult': [['ProdNo', 'FieldCode']],
    
    # Consistency Dimension
    'cons_list_str': {'Region': {'values': ['PM', 'SK', 'SB']}},
    'cons_uplo_csv': {
        'Region': {
            'csv_path': r"C:\Users\AEM-Azrien\Downloads\Qplus\Dev code\Master Data CSV\osdu_wks_master-data--GeoPoliticalEntity.csv",
            'ref_col': 'Name'},
        'Field': {
            'csv_path': r"C:\Users\AEM-Azrien\Downloads\Qplus\Dev code\Master Data CSV\osdu_wks_master-data--Field.csv",
            'ref_col': 'Field Name'}
        },
    # 'cons_conn_sql': {
    #     'Region': {
    #         'table': 'dbo.OSDU_Region',
    #         'ref_col': 'RegionName'}
    #     },
    
    # Validity Dimension - Numeric Type
    'vali_val_pos': ['TopDepth_m', 'BottomDepth_m', 'BoilingTemp_degC'],
    'vali_val_neg': ['FreezingTemp_degC'],
    'vali_val_rang': {'LowPressure_kpa': {'min': 1, 'max': 1000}},
    'vali_high_val': {'HighPressure_kpa': {'threshold': 1000}},
    'vali_low_val': {'LowPressure_kpa': {'threshold': 1000}},
    'vali_high_col': {'BottomDepth_m': {'compare_to': 'TopDepth_m'}},
    'vali_low_col': {'TopDepth_m': {'compare_to': 'BottomDepth_m'}},

    # Validity Dimension - String Type
    'vali_list_str': {
        'OilVolumeUOM': {'values': ['bbl/d', 'bpd']},
        'ResourceSecurityClassification': {'values': ['INTERNAL USE', 'RESTRICTED', 'CONFIDENTIAL']}
        }
}

df = input_file_parq(csv_path, parq_fold_path, dim_map)
engine = DataQualityEngine(df, dim_map)
enriched_df, report = engine.run()
enriched_path = Path(parq_fold_path) / "dq_enriched_output.parquet"
enriched_df.to_parquet(enriched_path, index=False)
engine.save("dq_report.json")

required_cols = get_req_col(dim_map) #Monitoring
print("Finished. Report generated.")

#---------------------------------------------------------------------------------------------------------------------


