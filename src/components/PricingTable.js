import React, { useState, useCallback } from 'react';
import { Table, Button, SpaceBetween, Box, Link } from '@cloudscape-design/components';
import { formatPrice } from '../utils/formatters';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function PricingTable({ provisionedPricing, onDemandPricing, formData, selectedRegion, multiSelectedRegions }) {
  const [showStrong, setShowStrong] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const calculateTotal = (pricing, consistency) => {
    const isStrong = consistency === 'strong';
    return (
      (isStrong ? pricing.strongConsistencyReads : pricing.eventualConsistencyReads) +
      (isStrong ? pricing.strongConsistencyWrites : pricing.eventualConsistencyWrites) +
      (isStrong ? pricing.strongConsistencyStorage : pricing.eventualConsistencyStorage) +
      (formData[selectedRegion].pointInTimeRecovery ? 
        (isStrong ? pricing.strongConsistencyBackup : pricing.eventualConsistencyBackup) : 0) +
      (isStrong ? pricing.strongConsistencyTtlDeletesPrice : pricing.eventualConsistencyTtlDeletesPrice)
    );
  };

  const baseColumns = [
    { 
      id: "metric",
      header: "Metric", 
      cell: item => item.metric
    },
    { 
      id: "provisionedEventual",
      header: "Provisioned (Eventual)", 
      cell: item => <Box textAlign="right">{formatPrice(item.provisionedEventual)}</Box>
    },
    { 
      id: "onDemandEventual",
      header: "On-Demand (Eventual)", 
      cell: item => <Box textAlign="right">{formatPrice(item.onDemandEventual)}</Box>
    },
  ];

  const allColumns = [
    { 
      id: "metric",
      header: "Metric", 
      cell: item => item.metric
    },
    { 
      id: "provisionedStrong",
      header: "Provisioned (Strong)", 
      cell: item => <Box textAlign="right">{formatPrice(item.provisionedStrong)}</Box>
    },
    { 
      id: "onDemandStrong",
      header: "On-Demand (Strong)", 
      cell: item => <Box textAlign="right">{formatPrice(item.onDemandStrong)}</Box>
    },
    { 
      id: "provisionedEventual",
      header: "Provisioned (Eventual)", 
      cell: item => <Box textAlign="right">{formatPrice(item.provisionedEventual)}</Box>
    },
    { 
      id: "onDemandEventual",
      header: "On-Demand (Eventual)", 
      cell: item => <Box textAlign="right">{formatPrice(item.onDemandEventual)}</Box>
    },
  ];

  const handleToggleStrong = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setShowStrong(prev => !prev);
      setIsTransitioning(false);
    }, 0);
  }, []);

  const tableItems = [
    { 
      metric: "Read Request Price", 
      provisionedStrong: provisionedPricing.strongConsistencyReads,
      provisionedEventual: provisionedPricing.eventualConsistencyReads,
      onDemandStrong: onDemandPricing.strongConsistencyReads,
      onDemandEventual: onDemandPricing.eventualConsistencyReads
    },
    { 
      metric: "Write Request Price", 
      provisionedStrong: provisionedPricing.strongConsistencyWrites,
      provisionedEventual: provisionedPricing.eventualConsistencyWrites,
      onDemandStrong: onDemandPricing.strongConsistencyWrites,
      onDemandEventual: onDemandPricing.eventualConsistencyWrites
    },
    { 
      metric: "Storage Price", 
      provisionedStrong: provisionedPricing.strongConsistencyStorage,
      provisionedEventual: provisionedPricing.eventualConsistencyStorage,
      onDemandStrong: onDemandPricing.strongConsistencyStorage,
      onDemandEventual: onDemandPricing.eventualConsistencyStorage
    },
    formData[selectedRegion].pointInTimeRecovery && { 
      metric: "Backup Price", 
      provisionedStrong: provisionedPricing.strongConsistencyBackup,
      provisionedEventual: provisionedPricing.eventualConsistencyBackup,
      onDemandStrong: onDemandPricing.strongConsistencyBackup,
      onDemandEventual: onDemandPricing.eventualConsistencyBackup
    },
    { 
      metric: "TTL Deletes Price", 
      provisionedStrong: provisionedPricing.strongConsistencyTtlDeletesPrice,
      provisionedEventual: provisionedPricing.eventualConsistencyTtlDeletesPrice,
      onDemandStrong: onDemandPricing.strongConsistencyTtlDeletesPrice,
      onDemandEventual: onDemandPricing.eventualConsistencyTtlDeletesPrice
    },
    { 
      metric: "Total", 
      provisionedStrong: calculateTotal(provisionedPricing, 'strong'),
      provisionedEventual: calculateTotal(provisionedPricing, 'eventual'),
      onDemandStrong: calculateTotal(onDemandPricing, 'strong'),
      onDemandEventual: calculateTotal(onDemandPricing, 'eventual')
    },
  ].filter(Boolean);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Amazon Keyspaces Pricing Calculator Results', 14, 20);
    
    // Add timestamp and region information
    const timestamp = new Date().toLocaleString();
    doc.setFontSize(10);
    doc.text(`Generated on: ${timestamp}`, 14, 30);
    doc.text(`Primary Region: ${selectedRegion}`, 14, 35);
    
    if (multiSelectedRegions && multiSelectedRegions.length > 0) {
      doc.text('Additional Regions:', 14, 40);
      multiSelectedRegions.forEach((region, index) => {
        doc.text(`- ${region.value}`, 20, 45 + (index * 5));
      });
    }

    // Prepare table data with all pricing information
    const tableData = [
      ['Metric', 'Provisioned (Strong)', 'On-Demand (Strong)', 'Provisioned (Eventual)', 'On-Demand (Eventual)'],
      ['Read Request Units', 
        formatPrice(provisionedPricing.strongConsistencyReads),
        formatPrice(onDemandPricing.strongConsistencyReads),
        formatPrice(provisionedPricing.eventualConsistencyReads),
        formatPrice(onDemandPricing.eventualConsistencyReads)
      ],
      ['Write Request Units',
        formatPrice(provisionedPricing.strongConsistencyWrites),
        formatPrice(onDemandPricing.strongConsistencyWrites),
        formatPrice(provisionedPricing.eventualConsistencyWrites),
        formatPrice(onDemandPricing.eventualConsistencyWrites)
      ],
      ['Storage Price',
        formatPrice(provisionedPricing.strongConsistencyStorage),
        formatPrice(onDemandPricing.strongConsistencyStorage),
        formatPrice(provisionedPricing.eventualConsistencyStorage),
        formatPrice(onDemandPricing.eventualConsistencyStorage)
      ]
    ];

    // Add backup price row if PITR is enabled
    if (formData[selectedRegion].pointInTimeRecovery) {
      tableData.push([
        'Backup Price',
        formatPrice(provisionedPricing.strongConsistencyBackup),
        formatPrice(onDemandPricing.strongConsistencyBackup),
        formatPrice(provisionedPricing.eventualConsistencyBackup),
        formatPrice(onDemandPricing.eventualConsistencyBackup)
      ]);
    }

    // Add TTL Deletes Price row
    tableData.push([
      'TTL Deletes Price',
      formatPrice(provisionedPricing.strongConsistencyTtlDeletesPrice),
      formatPrice(onDemandPricing.strongConsistencyTtlDeletesPrice),
      formatPrice(provisionedPricing.eventualConsistencyTtlDeletesPrice),
      formatPrice(onDemandPricing.eventualConsistencyTtlDeletesPrice)
    ]);

    // Add Total row
    tableData.push([
      'Total',
      formatPrice(calculateTotal(provisionedPricing, 'strong')),
      formatPrice(calculateTotal(onDemandPricing, 'strong')),
      formatPrice(calculateTotal(provisionedPricing, 'eventual')),
      formatPrice(calculateTotal(onDemandPricing, 'eventual'))
    ]);

    // Calculate starting Y position based on number of regions
    const startY = multiSelectedRegions.length > 0 ? 50 + (multiSelectedRegions.length * 5) : 45;

    // Generate the table
    doc.autoTable({
      head: [tableData[0]],
      body: tableData.slice(1),
      startY: startY,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 5,
        lineColor: [238, 238, 238],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [35, 47, 62],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [249, 249, 249]
      }
    });

    // Add Input Parameters section after the pricing table
    const inputStartY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text('Input Parameters', 14, inputStartY);

    // Primary Region Input Data
    const inputData = [
      ['Parameter', 'Primary Region Value']
    ];

    // Add primary region data
    inputData.push(
      ['Average Read Requests/sec', formData[selectedRegion].averageReadRequests],
      ['Average Write Requests/sec', formData[selectedRegion].averageWriteRequests],
      ['Average Row Size (bytes)', formData[selectedRegion].averageRowSizeInBytes],
      ['Storage (GB)', formData[selectedRegion].storageInGb],
      ['Point-in-Time Recovery', formData[selectedRegion].pointInTimeRecovery ? 'Enabled' : 'Disabled'],
      ['TTL Deletes %', formData[selectedRegion].ttlDeletesPerSecond]
    );

    // Generate input parameters table for primary region
    doc.autoTable({
      head: [inputData[0]],
      body: inputData.slice(1),
      startY: inputStartY + 10,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 5,
        lineColor: [238, 238, 238],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [35, 47, 62],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [249, 249, 249]
      }
    });

    // Add Additional Regions Input Data if any
    if (multiSelectedRegions && multiSelectedRegions.length > 0) {
      const additionalStartY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(12);
      doc.text('Additional Regions - Read Requests/sec', 14, additionalStartY);

      const additionalData = [
        ['Region', 'Read Requests/sec']
      ];

      multiSelectedRegions.forEach(region => {
        additionalData.push([
          region.value,
          formData[region.value]?.averageReadRequests || '0'
        ]);
      });

      doc.autoTable({
        head: [additionalData[0]],
        body: additionalData.slice(1),
        startY: additionalStartY + 10,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 5,
          lineColor: [238, 238, 238],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [35, 47, 62],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [249, 249, 249]
        }
      });
    }

    // Save the PDF
    doc.save('keyspaces-pricing-calculator-results.pdf');
  };

  return (
    <SpaceBetween size="m">
      <Box float="right">
        <Link onFollow={exportToPDF} href="#">
          Export to PDF
        </Link>
      </Box>
      <Button
        onClick={handleToggleStrong}
        disabled={isTransitioning}
      >
        {showStrong ? 'Hide Strong Consistency' : 'Show Strong Consistency'}
      </Button>
      {!isTransitioning && (
        <Table
          columnDefinitions={showStrong ? allColumns : baseColumns}
          items={tableItems}
          variant="embedded"
          stickyHeader={false}
          resizableColumns={false}
          wrapLines={false}
          stripedRows={false}
          contentDensity="compact"
          enableKeyboardNavigation={false}
          trackBy="metric"
        />
      )}
    </SpaceBetween>
  );
}

export default PricingTable;
