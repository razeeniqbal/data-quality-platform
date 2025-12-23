# Data Quality Platform - Usage Guide

## Issues Fixed

### 1. Database Access
**Problem:** RLS policies required authentication but no auth was set up.
**Solution:** Updated policies to allow anonymous/public access for demonstration purposes.

### 2. CSV Upload
**Problem:** Basic CSV parsing couldn't handle quoted values or empty fields.
**Solution:**
- Implemented proper CSV parser that handles quoted values
- Added validation for empty files and missing headers
- Enhanced error messages to show specific issues
- Added file type validation

### 3. Connection Features
**Problem:** "API Connection" and "SQL Credential" buttons were non-functional.
**Solution:** Added informative messages indicating these features are coming soon.

## How to Use the Platform

### Step 1: Upload Your Data

1. Navigate to the **Score** page from the top navigation
2. **Upload a CSV file** by either:
   - Clicking "Browse" to select a file
   - Dragging and dropping a CSV file into the upload area
3. A sample CSV file (`sample-data.csv`) is included in the project root for testing

### Step 2: Preview Your Data

After upload, you'll see:
- A data preview showing the first 5 rows
- Total row count
- All column headers

### Step 3: Configure Quality Checks

Assign columns to quality dimensions by clicking "Select or Drag & Drop Attributes":

- **Completeness**: Checks if data is present (non-empty values)
- **Consistency**: Validates data follows defined patterns (placeholder)
- **Validity**: Ensures data meets specific criteria (placeholder)
- **Uniqueness**: Verifies no duplicate values

### Step 4: Execute Quality Checks

1. Click the **Execute** button
2. The system will run quality checks on all configured columns
3. Wait for processing to complete

### Step 5: View Results

The results page shows:
- **Overall quality score** (percentage)
- **Individual dimension scores**
- **Pass/fail counts** for each rule
- **Filtering options**:
  - By status (All, Pass, Failed)
  - By score range (100%, 75%, 50%, 0%)
- **Export button** to download results as CSV

## Sample Data

The included `sample-data.csv` contains:
- 20 rows of test data
- 14 attributes
- Some intentionally empty fields to test completeness
- Unique values in key columns to test uniqueness

## Current Limitations

1. **Authentication**: Platform is in demo mode - all data is public
2. **Consistency Rules**: Need manual configuration (coming soon)
3. **Validity Rules**: Need manual configuration (coming soon)
4. **API/SQL Connections**: Not yet implemented
5. **Templates**: Save/load functionality is placeholders

## Next Steps for Production

1. Implement user authentication
2. Add custom rule configuration UI
3. Build API and SQL connection features
4. Complete template save/load functionality
5. Add data visualization charts
6. Implement batch processing for large datasets
