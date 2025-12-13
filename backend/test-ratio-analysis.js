const axios = require('axios');

async function testRatioAnalysis() {
    console.log('🧪 TESTING RATIO ANALYSIS API');
    console.log('=============================\n');

    const baseURL = 'https://inventory.works/api/reports';

    try {
        console.log('🧪 Testing ratio-analysis endpoint...');
        const response = await axios.get(`${baseURL}/ratio-analysis?fromDate=2024-07-01&toDate=2025-12-13`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Ratio-Analysis-Test'
            }
        });

        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Response keys: ${Object.keys(response.data).join(', ')}`);

        // Check the structure
        console.log('\n📋 Full response structure:');
        console.log(JSON.stringify(response.data, null, 2));

        // Check if ratios exist
        if (response.data.ratios) {
            console.log('\n✅ Ratios object found:');
            console.log(`📊 Ratios keys: ${Object.keys(response.data.ratios).join(', ')}`);

            if (response.data.ratios.liquidityRatios) {
                console.log('📊 Liquidity ratios:', response.data.ratios.liquidityRatios);
            }
            if (response.data.ratios.profitabilityRatios) {
                console.log('📊 Profitability ratios:', response.data.ratios.profitabilityRatios);
            }
            if (response.data.ratios.leverageRatios) {
                console.log('📊 Leverage ratios:', response.data.ratios.leverageRatios);
            }
        } else {
            console.log('❌ No ratios object in response');
        }

        // Check summary data
        if (response.data.summary) {
            console.log('\n✅ Summary data found:');
            console.log(`📊 Summary keys: ${Object.keys(response.data.summary).join(', ')}`);
            console.log('📊 Summary values:', response.data.summary);
        }

    } catch (error) {
        console.log(`❌ API Error: ${error.response?.status || 'Network Error'}`);
        console.log(`   Message: ${error.response?.data?.message || error.message}`);

        if (error.response?.data?.error) {
            console.log(`   Details: ${error.response.data.error}`);
        }

        if (error.response?.data) {
            console.log('\n📋 Error response data:');
            console.log(JSON.stringify(error.response.data, null, 2));
        }
    }
}

testRatioAnalysis();