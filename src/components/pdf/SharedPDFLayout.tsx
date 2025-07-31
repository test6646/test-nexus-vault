import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

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
    paddingBottom: 15,
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
    marginBottom: 3,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: '#555555',
    width: 80,
    marginRight: 5,
  },
  detailValue: {
    fontSize: 9,
    color: '#333333',
    flex: 1,
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
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 10,
    fontWeight: 600,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    color: '#333333',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  tableCellAmount: {
    flex: 1,
    fontSize: 9,
    textAlign: 'right',
    fontWeight: 500,
    color: '#333333',
    paddingHorizontal: 4,
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
}

export const SharedPDFHeader: React.FC<SharedPDFHeaderProps> = ({ children }) => (
  <View style={sharedStyles.header}>
    <View style={sharedStyles.logoSection}>
      <View style={sharedStyles.brandInfo}>
        <Text style={sharedStyles.companyName}>Prit Photo Studio</Text>
        <Text style={sharedStyles.tagline}>Professional Photography & Videography Services</Text>
      </View>
    </View>
    
    <View style={sharedStyles.contactSection}>
      <Text style={sharedStyles.contactText}>Contact: +91 72850 72603</Text>
      <Text style={sharedStyles.contactText}>Email: pritphoto1985@gmail.com</Text>
      <Text style={sharedStyles.hashtagText}>#aJourneyOfLoveByPritPhoto</Text>
    </View>
  </View>
);

export const SharedPDFFooter: React.FC = () => (
  <Text style={sharedStyles.footer}>
    Prit Photo Studio | Professional Photography & Videography Services{'\n'}
    Contact: +91 72850 72603 | Email: pritphoto1985@gmail.com{'\n'}
    #aJourneyOfLoveByPritPhoto | Your memories, our passion
  </Text>
);

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