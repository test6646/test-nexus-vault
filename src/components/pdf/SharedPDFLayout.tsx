import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register Lexend font from local file
Font.register({
  family: 'Lexend',
  src: '/fonts/Lexend.ttf',
});

export const sharedStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 24,
    fontFamily: 'Lexend',
    fontSize: 10,
    lineHeight: 1.3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingLeft: 0,
    paddingRight: 0,
    borderBottomWidth: 2,
    borderBottomColor: '#c4b28d',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandInfo: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#c4b28d',
    marginBottom: 3,
    lineHeight: 1.2,
  },
  tagline: {
    fontSize: 8,
    color: '#666666',
    fontWeight: 400,
    lineHeight: 1.3,
  },
  contactSection: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    flex: 1,
  },
  contactText: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 2,
    textAlign: 'right',
    lineHeight: 1.3,
  },
  hashtagText: {
    fontSize: 7,
    color: '#c4b28d',
    fontWeight: 600,
    marginTop: 2,
    textAlign: 'right',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'center',
    color: '#c4b28d',
    marginBottom: 20,
    padding: 8,
    backgroundColor: '#f8f6f1',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c4b28d',
  },
  documentId: {
    fontSize: 11,
    fontWeight: 600,
    color: '#c4b28d',
    marginBottom: 5,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  column: {
    flex: 1,
    paddingRight: 15,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#c4b28d',
    marginBottom: 6,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#c4b28d',
    paddingBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: '#555555',
    width: 70,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 9,
    color: '#333333',
    flex: 1,
    lineHeight: 1.4,
  },
  tableCellMultiLine: {
    flex: 1,
    fontSize: 9,
    color: '#333333',
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'column',
  },
  tableCellTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: '#333333',
  },
  tableCellSubtitle: {
    fontSize: 8,
    color: '#666666',
    marginTop: 2,
  },
  rolesText: {
    fontSize: 8,
    color: '#333333',
    lineHeight: 1.3,
  },
  table: {
    marginVertical: 12,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#c4b28d',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
    minHeight: 32,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 32,
  },
  // SIMPLIFIED - ONLY CENTER ALIGNED TABLE CELLS
  tableCellHeader: {
    flex: 1,
    fontSize: 10,
    fontWeight: 600,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    color: '#333333',
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tableCellAmount: {
    flex: 1,
    fontSize: 9,
    color: '#333333',
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    textAlign: 'center',
    fontSize: 8,
    color: '#888888',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  statusBadge: {
    fontSize: 8,
    fontWeight: 600,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    textAlign: 'center',
    alignSelf: 'flex-start',
  },
  statusPaid: {
    backgroundColor: '#c4b28d',
    color: '#ffffff',
  },
  statusPending: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
  },
  statusOverdue: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
  },
  statusPartial: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  },
});

interface SharedPDFHeaderProps {
  children?: React.ReactNode;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  };
}

export const SharedPDFHeader: React.FC<SharedPDFHeaderProps> = ({ children, firmData }) => {
  // Use provided firmData directly - all PDFs should fetch it before calling this component
  if (!firmData) {
    return (
      <View style={sharedStyles.header}>
        <View style={sharedStyles.logoSection}>
          <View style={sharedStyles.brandInfo}>
            <Text style={sharedStyles.companyName}>Your Business</Text>
          </View>
        </View>
        <View style={sharedStyles.contactSection}>
          <Text style={sharedStyles.contactText}>Professional Service Report</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={sharedStyles.header}>
      <View style={sharedStyles.logoSection}>
        {firmData.logo_url && (
          <Image 
            src={firmData.logo_url}
            style={{ 
              width: 120, 
              objectFit: 'contain'
            }}
          />
        )}
        {!firmData.logo_url && firmData.name && (
          <View style={sharedStyles.brandInfo}>
            <Text style={sharedStyles.companyName}>{firmData.name}</Text>
          </View>
        )}
      </View>
      
      <View style={sharedStyles.contactSection}>
        {firmData.name && (
          <Text style={sharedStyles.contactText}>{firmData.name}</Text>
        )}
        {firmData.header_left_content && firmData.header_left_content.split(/\r?\n/).map((line, index) => (
          <Text key={index} style={sharedStyles.contactText}>{line}</Text>
        ))}
        {firmData.description && (
          <Text style={sharedStyles.hashtagText}>{firmData.description}</Text>
        )}
      </View>
    </View>
  );
};

interface SharedPDFFooterProps {
  firmData?: {
    name: string;
    footer_content?: string;
  };
}

export const SharedPDFFooter: React.FC<SharedPDFFooterProps> = ({ firmData }) => {
  // Use provided firmData directly - all PDFs should fetch it before calling this component
  if (!firmData?.footer_content) {
    return (
      <Text style={sharedStyles.footer}>
        Generated on {new Date().toLocaleDateString('en-IN')} | Professional Service Report
      </Text>
    );
  }

  // Split footer content by line breaks and render each line separately
  const footerLines = firmData.footer_content.split(/\r?\n/);

  return (
    <View style={sharedStyles.footer}>
      {footerLines.map((line, index) => (
        <Text key={index} style={{ fontSize: 8, color: '#888888', textAlign: 'center' }}>
          {line}
        </Text>
      ))}
    </View>
  );
};

interface StatusBadgeProps {
  status: 'Paid' | 'Pending' | 'Partial' | 'Overdue';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return [sharedStyles.statusBadge, sharedStyles.statusPaid];
      case 'pending':
        return [sharedStyles.statusBadge, sharedStyles.statusPending];
      case 'partial':
        return [sharedStyles.statusBadge, sharedStyles.statusPartial];
      case 'overdue':
        return [sharedStyles.statusBadge, sharedStyles.statusOverdue];
      default:
        return [sharedStyles.statusBadge, sharedStyles.statusPending];
    }
  };

  return (
    <Text style={getStatusStyle(status)}>
      {status.toUpperCase()}
    </Text>
  );
};

// ENHANCED TABLE COMPONENT WITH MULTI-LINE SUPPORT
interface SimpleTableProps {
  headers: string[];
  rows: (string | number | { title: string; subtitle?: string } | { text: string; lines?: string[] })[][];
  multiLineColumns?: number[]; // Column indices that support multi-line content
}

export const SimpleTable: React.FC<SimpleTableProps> = ({ headers, rows, multiLineColumns = [] }) => (
  <View style={sharedStyles.table}>
    {/* Header Row */}
    <View style={sharedStyles.tableHeader}>
      {headers.map((header, index) => (
        <Text key={index} style={sharedStyles.tableCellHeader}>
          {header}
        </Text>
      ))}
    </View>
    
    {/* Data Rows */}
    {rows.map((row, rowIndex) => (
      <View 
        key={rowIndex} 
        style={rowIndex % 2 === 0 ? sharedStyles.tableRow : sharedStyles.tableRowAlt}
      >
        {row.map((cell, cellIndex) => {
          const isMultiLineColumn = multiLineColumns.includes(cellIndex);
          
          if (isMultiLineColumn && typeof cell === 'object' && cell !== null) {
            if ('title' in cell) {
              // Event title with subtitle (type)
              return (
                <View key={cellIndex} style={sharedStyles.tableCellMultiLine}>
                  <Text style={sharedStyles.tableCellTitle}>{cell.title}</Text>
                  {cell.subtitle && (
                    <Text style={sharedStyles.tableCellSubtitle}>({cell.subtitle})</Text>
                  )}
                </View>
              );
            } else if ('text' in cell && 'lines' in cell) {
              // Roles with line breaks
              return (
                <View key={cellIndex} style={sharedStyles.tableCellMultiLine}>
                  {cell.lines && cell.lines.length > 0 ? (
                    cell.lines.map((line, lineIndex) => (
                      <Text key={lineIndex} style={sharedStyles.rolesText}>
                        {line}
                      </Text>
                    ))
                  ) : (
                    <Text style={sharedStyles.rolesText}>{cell.text}</Text>
                  )}
                </View>
              );
            }
          }
          
          // Regular text cell
          return (
            <Text key={cellIndex} style={sharedStyles.tableCell}>
              {cell !== null && cell !== undefined ? String(cell) : ''}
            </Text>
          );
        })}
      </View>
    ))}
  </View>
);