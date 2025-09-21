/**
 * Shared Google Sheets Operations
 * Provides standardized methods for Google Sheets operations with consistent error handling
 */

import { getGoogleAccessToken, validateGoogleResponse } from './google-auth.ts';

/**
 * Get sheet ID by name from spreadsheet
 */
export async function getSheetId(accessToken: string, spreadsheetId: string, sheetName: string): Promise<number> {
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  validateGoogleResponse(response, `get sheet metadata for ${sheetName}`);
  
  const spreadsheet = await response.json();
  const sheet = spreadsheet.sheets?.find((s: any) => s.properties.title === sheetName);
  
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
  }
  
  return sheet.properties.sheetId;
}

/**
 * Get all values from a sheet
 */
export async function getSheetValues(accessToken: string, spreadsheetId: string, sheetName: string): Promise<any[][]> {
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  validateGoogleResponse(response, `get values from ${sheetName}`);
  
  const result = await response.json();
  return result.values || [];
}

/**
 * Update or append data to a sheet with proper formatting
 */
export async function updateOrAppendToSheet(
  accessToken: string,
  spreadsheetId: string, 
  sheetName: string, 
  data: any[], 
  matchColumnIndex: number = 0
): Promise<void> {
  
  // Get existing data
  const existingData = await getSheetValues(accessToken, spreadsheetId, sheetName);
  
  // Find if record exists (skip header row)
  let rowIndex = -1;
  const matchValue = data[matchColumnIndex];
  
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i] && existingData[i][matchColumnIndex] === matchValue) {
      rowIndex = i + 1; // Google Sheets is 1-indexed
      break;
    }
  }
  
  // Get sheet ID for batch update
  const sheetId = await getSheetId(accessToken, spreadsheetId, sheetName);
  
  // Prepare formatted data with Lexend font
  const formattedRow = [{
    values: data.map(cell => ({
      userEnteredValue: typeof cell === 'number' ? { numberValue: cell } : { stringValue: String(cell ?? '') },
      userEnteredFormat: {
        textFormat: {
          fontFamily: 'Lexend',
          fontSize: 10
        }
      }
    }))
  }];
  
  let targetRowIndex: number;
  let operation: string;
  
  if (rowIndex > 0) {
    // Update existing record
    targetRowIndex = rowIndex - 1; // Convert to 0-indexed
    operation = 'update';
  } else {
    // Append new record
    targetRowIndex = existingData.length; // Next available row (0-indexed)
    operation = 'append';
  }
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: targetRowIndex,
              startColumnIndex: 0,
              endRowIndex: targetRowIndex + 1
            },
            rows: formattedRow,
            fields: 'userEnteredValue,userEnteredFormat.textFormat'
          }
        }]
      })
    }
  );
  
  validateGoogleResponse(response, `${operation} ${sheetName}`);
  
  console.log(`✅ ${operation === 'update' ? 'Updated' : 'Added'} record in ${sheetName} at row ${targetRowIndex + 1}`);
}

/**
 * Delete a record from a sheet by matching column value
 */
export async function deleteFromSheet(
  accessToken: string,
  spreadsheetId: string, 
  sheetName: string, 
  matchValue: string, 
  matchColumnIndex: number = 0
): Promise<void> {
  console.log(`🗑️ Deleting from ${sheetName} - Match value:`, matchValue);
  
  // Get existing data
  const existingData = await getSheetValues(accessToken, spreadsheetId, sheetName);
  
  // Find record to delete (skip header row)
  let rowIndex = -1;
  
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i] && existingData[i][matchColumnIndex] === matchValue) {
      rowIndex = i; // Keep 0-indexed for deletion
      break;
    }
  }
  
  if (rowIndex === -1) {
    console.log(`ℹ️ Record not found in ${sheetName}, nothing to delete`);
    return;
  }
  
  // Get sheet ID for deletion
  const sheetId = await getSheetId(accessToken, spreadsheetId, sheetName);
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }]
      })
    }
  );
  
  validateGoogleResponse(response, `delete from ${sheetName}`);
  
  console.log(`✅ Deleted record from ${sheetName} at row ${rowIndex + 1}`);
}

/**
 * Ensure a sheet exists with proper headers
 */
export async function ensureSheetExists(
  accessToken: string,
  spreadsheetId: string, 
  sheetName: string, 
  headers: string[]
): Promise<void> {
  try {
    // Try to get sheet ID (will throw if doesn't exist)
    await getSheetId(accessToken, spreadsheetId, sheetName);
    console.log(`✅ Sheet ${sheetName} already exists`);
    
    // Verify headers are correct
    const existingData = await getSheetValues(accessToken, spreadsheetId, sheetName);
    if (existingData.length === 0 || !arraysEqual(existingData[0], headers)) {
      // Update headers
      await updateSheetHeaders(accessToken, spreadsheetId, sheetName, headers);
    }
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      // Sheet doesn't exist, create it
      await createSheetWithHeaders(accessToken, spreadsheetId, sheetName, headers);
    } else {
      throw error;
    }
  }
}

/**
 * Create a new sheet with headers
 */
async function createSheetWithHeaders(
  accessToken: string,
  spreadsheetId: string, 
  sheetName: string, 
  headers: string[]
): Promise<void> {
  
  // Create sheet
  const createResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          addSheet: {
            properties: {
              title: sheetName
            }
          }
        }]
      })
    }
  );
  
  validateGoogleResponse(createResponse, `create sheet ${sheetName}`);
  
  // Add headers
  await updateSheetHeaders(accessToken, spreadsheetId, sheetName, headers);
  
  console.log(`✅ Created sheet ${sheetName} with headers`);
}

/**
 * Update sheet headers with proper formatting
 */
async function updateSheetHeaders(
  accessToken: string,
  spreadsheetId: string, 
  sheetName: string, 
  headers: string[]
): Promise<void> {
  const sheetId = await getSheetId(accessToken, spreadsheetId, sheetName);
  
  // Format headers with bold Lexend font
  const formattedHeaders = [{
    values: headers.map(header => ({
      userEnteredValue: { stringValue: header },
      userEnteredFormat: {
        textFormat: {
          fontFamily: 'Lexend',
          fontSize: 10,
          bold: true
        },
        backgroundColor: {
          red: 0.9,
          green: 0.9,
          blue: 0.9
        }
      }
    }))
  }];
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              startColumnIndex: 0,
              endRowIndex: 1,
              endColumnIndex: headers.length
            },
            rows: formattedHeaders,
            fields: 'userEnteredValue,userEnteredFormat'
          }
        }]
      })
    }
  );
  
  validateGoogleResponse(response, `update headers for ${sheetName}`);
  
  console.log(`✅ Updated headers for ${sheetName}`);
}

/**
 * Helper to compare arrays
 */
function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}