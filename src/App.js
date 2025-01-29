import React, { useState, useEffect } from 'react';
import PricingTable from './components/PricingTable';
import Navigation from './components/Navigation';
import MultiRegionForm from './components/MultiRegionForm';
import KeyspacesHelpPanel from './components/KeyspacesHelpPanel';
import pricingDataJson from './data/mcs.json';  // Import the JSON directly

import {
    AppLayout,
    Container
} from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';

function App() {
    const [currentPricing, setCurrentPricing] = useState({});
    const [provisionedPricing, setProvisionedPricing] = useState({});
    const [onDemandPricing, setOnDemandPricing] = useState({});
    const [selectedRegion, setSelectedRegion] = useState('US East (Ohio)');
    const [multiSelectedRegions, setMultiSelectedRegions] = useState([]);
    const [expandedRegions, setExpandedRegions] = useState({});
    const [formData, setFormData] = useState({
        [selectedRegion]: {
            averageReadRequests: 0,
            averageWriteRequests: 0,
            averageRowSizeInBytes: 0,
            storageInGb: 0,
            pointInTimeRecovery: false,
            ttlDeletesPerSecond: 0
        }
    });

    useEffect(() => {
        setCurrentPricing(processRegion('US East (Ohio)'));
    }, []);

    useEffect(() => {
        setFormData(prevFormData => {
            const newFormData = { ...prevFormData };
            const defaultData = {
                averageReadRequests: 0,
                averageWriteRequests: 0,
                averageRowSizeInBytes: 0,
                storageInGb: 0,
                pointInTimeRecovery: false,
                ttlDeletesPerSecond: 0
            };
    
            // Ensure default region always has data
            if (!newFormData.default) {
                newFormData.default = { ...defaultData };
            }
    
            // Add data for each selected region
            multiSelectedRegions.forEach(region => {
                if (!newFormData[region.value]) {
                    newFormData[region.value] = { ...defaultData };
                }
            });
    
            return newFormData;
        });
    }, [multiSelectedRegions]);

    const processRegion = (regionCode) => {
        if (!pricingDataJson || !pricingDataJson.regions || !pricingDataJson.regions[regionCode]) {
            console.log('No pricing data available for region:', regionCode);
            return null;
        }

        const regionPricing = pricingDataJson.regions[regionCode];
        return {
            readRequestPrice: regionPricing['MCS-ReadUnits'].price,
            writeRequestPrice: regionPricing['MCS-WriteUnits'].price,
            writeRequestPricePerHour: regionPricing['Provisioned Write Units'].price,
            readRequestPricePerHour: regionPricing['Provisioned Read Units'].price,
            storagePricePerGB: regionPricing['AmazonMCS - Indexed DataStore per GB-Mo'].price,
            pitrPricePerGB: regionPricing['Point-In-Time-Restore PITR Backup Storage per GB-Mo'].price,
            ttlDeletesPrice: regionPricing['Time to Live'].price
        };
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const isMultiRegion = multiSelectedRegions.length > 0;
        calculatePricing(formData, isMultiRegion);
        
    };

    function getAvgProvisionedCapacityUnits(requests, size, cuMultiplier) {
        return Math.ceil((requests * Math.ceil(size * 1 / (cuMultiplier * 1024))) / 0.80);
    }

    function getOnDemandCUs(requests, size, cuMultiplier) {
        return Math.ceil(requests * Math.ceil(size * 1 / (cuMultiplier * 1024))) * 3600 * 24 * 30.41667;
    }

    function getStrongConsistencyUnits(avgCUs, avgHours, price) {
        return Math.ceil(avgCUs * avgHours * price * 30.41667);
    }

    var getTtlDeletesPrice = (ttlDeletesPerDay, averageRowSizeInBytes) => {
        return (ttlDeletesPerDay * Math.ceil(averageRowSizeInBytes/1024)*365)/12;
    }

    const calculatePricing = (formData) => {
        const isMultiRegion = multiSelectedRegions.length > 0;
        let totalStrongConsistencyReads = 0;
        let totalEventualConsistencyReads = 0;
        let totalStrongConsistencyWrites = 0;
        let totalEventualConsistencyWrites = 0;
        let totalStoragePrice = 0;
        let totalBackupPrice = 0;
        let totalTtlDeletesPrice = 0;
    
        let totalOnDemandReads = 0;
        let totalOnDemandWrites = 0;
    
        const regions = [selectedRegion, ...multiSelectedRegions.map(r => r.value)];
        console.log(regions);
        console.log(multiSelectedRegions)
        console.log(selectedRegion)
    
        regions.forEach(region => {
            console.log(formData);
            console.log(region);
            let regionData = formData[region];
            let regionPricing;
    
            if (isMultiRegion) {
                if (region === 'default') {
                    region = selectedRegion;
                }
                regionPricing = processRegion(region);
            } else {
                regionPricing = currentPricing;
            }

            console.log(regionPricing);
            const writesPriceMultiplier = isMultiRegion ? 1.25 : 1;
    
            if (regionPricing) {
                const avgReadProvisionedCapacityUnits = getAvgProvisionedCapacityUnits(regionData.averageReadRequests, regionData.averageRowSizeInBytes, 4);
                const strongConsistencyReads = getStrongConsistencyUnits(avgReadProvisionedCapacityUnits, 24, regionPricing.readRequestPricePerHour);
    
                const avgWriteProvisionedCapacityUnits = getAvgProvisionedCapacityUnits(regionData.averageWriteRequests, regionData.averageRowSizeInBytes, 1);
                const strongConsistencyWrites = getStrongConsistencyUnits(avgWriteProvisionedCapacityUnits, 24, regionPricing.writeRequestPricePerHour) * writesPriceMultiplier;
    
                const storagePrice = regionData.storageInGb * regionPricing.storagePricePerGB;
                const backupPrice = regionData.storageInGb * regionPricing.pitrPricePerGB;
    
                const onDemandReadsPrice = getOnDemandCUs(regionData.averageReadRequests, regionData.averageRowSizeInBytes, 4) * regionPricing.readRequestPrice;
                const onDemandWritesPrice = getOnDemandCUs(regionData.averageWriteRequests, regionData.averageRowSizeInBytes, 1) * regionPricing.writeRequestPrice * writesPriceMultiplier;
    
                const ttlDeletesPrice = getTtlDeletesPrice(regionData.ttlDeletesPerSecond, regionData.averageRowSizeInBytes) * regionPricing.ttlDeletesPrice;
    
                totalStrongConsistencyReads += strongConsistencyReads;
                totalEventualConsistencyReads += strongConsistencyReads / 2;
                totalStrongConsistencyWrites += strongConsistencyWrites;
                totalEventualConsistencyWrites += strongConsistencyWrites;
                totalStoragePrice += storagePrice;
                totalBackupPrice += backupPrice;
                totalTtlDeletesPrice += ttlDeletesPrice;
    
                totalOnDemandReads += onDemandReadsPrice;
                totalOnDemandWrites += onDemandWritesPrice;
            }
        });
    
        const writesMultiplier = isMultiRegion ? regions.length : 1;
    
        setProvisionedPricing({
            strongConsistencyReads: totalStrongConsistencyReads,
            strongConsistencyWrites: totalStrongConsistencyWrites * writesMultiplier,
            eventualConsistencyReads: totalEventualConsistencyReads,
            eventualConsistencyWrites: totalEventualConsistencyWrites * writesMultiplier,
            strongConsistencyStorage: totalStoragePrice,
            strongConsistencyBackup: totalBackupPrice,
            eventualConsistencyStorage: totalStoragePrice,
            eventualConsistencyBackup: totalBackupPrice,
            eventualConsistencyTtlDeletesPrice: totalTtlDeletesPrice,
            strongConsistencyTtlDeletesPrice: totalTtlDeletesPrice
        });
    
        setOnDemandPricing({
            strongConsistencyReads: totalOnDemandReads,
            strongConsistencyWrites: totalOnDemandWrites * writesMultiplier,
            eventualConsistencyReads: totalOnDemandReads / 2,
            eventualConsistencyWrites: totalOnDemandWrites * writesMultiplier,
            strongConsistencyStorage: totalStoragePrice,
            strongConsistencyBackup: totalBackupPrice,
            eventualConsistencyStorage: totalStoragePrice,
            eventualConsistencyBackup: totalBackupPrice,
            eventualConsistencyTtlDeletesPrice: totalTtlDeletesPrice,
            strongConsistencyTtlDeletesPrice: totalTtlDeletesPrice
        });
    };

    return (
        <AppLayout
            navigation={<Navigation />}
            tools={<KeyspacesHelpPanel />}
            content={
                <Container>
                    <MultiRegionForm
                        selectedRegion={selectedRegion}
                        setSelectedRegion={setSelectedRegion}
                        multiSelectedRegions={multiSelectedRegions}
                        setMultiSelectedRegions={setMultiSelectedRegions}
                        formData={formData}
                        setFormData={setFormData}
                        onSubmit={handleSubmit}
                        expandedRegions={expandedRegions}
                        setExpandedRegions={setExpandedRegions}
                    />

                    {provisionedPricing && Object.keys(provisionedPricing).length > 0 && (
                        <PricingTable 
                            provisionedPricing={provisionedPricing}
                            onDemandPricing={onDemandPricing}
                            formData={formData}
                            selectedRegion={selectedRegion}
                            multiSelectedRegions={multiSelectedRegions}
                        />
                    )}
                   
                </Container>
            }
        />
    );
}

export default App;