// Utility function to create clean, professional PDF file names
export const createCleanPDFName = (
  type: string,
  identifier?: string,
  date?: Date
): string => {
  const currentDate = date || new Date();
  const dateStr = currentDate.toISOString().split('T')[0];
  
  // Clean and format the identifier (names, titles, etc.)
  const cleanIdentifier = identifier 
    ? identifier
        .replace(/[&]/g, '&') // Keep ampersands as is
        .replace(/[^a-zA-Z0-9\s&]/g, ' ') // Replace special chars with spaces
        .replace(/\s+/g, ' ') // Normalize multiple spaces
        .trim()
    : '';
  
  // Create the filename based on type and identifier
  if (cleanIdentifier) {
    return `${cleanIdentifier} ${type} ${dateStr}.pdf`;
  } else {
    return `${type} ${dateStr}.pdf`;
  }
};

// Helper function to format names properly
export const formatNameForPDF = (name: string): string => {
  return name
    .replace(/[&]/g, '&') // Keep ampersands
    .replace(/[^a-zA-Z0-9\s&]/g, ' ') // Replace special chars with spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
};